package com.ifm.tech.event_planning.service;

import com.ifm.tech.event_planning.dto.SessionDTO;
import com.ifm.tech.event_planning.entity.SessionEntity;
import com.ifm.tech.event_planning.repository.SessionRepository;
import jakarta.annotation.PreDestroy;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;

@Service
public class SessionService {

    private final SessionRepository sessionRepository;
    private final CacheManager cacheManager;
    private final ExecutorService validatorPool;


    public SessionService(SessionRepository sessionRepository, CacheManager cacheManager, ExecutorService validatorPool) {
        this.sessionRepository = sessionRepository;
        this.cacheManager = cacheManager;
        this.validatorPool = validatorPool;
    }

    @PreDestroy
    public void shutdownValidatorPool() {
        validatorPool.shutdownNow();
    }

    @Transactional
    @CachePut(value = "sessions", key = "#result.id")
    @CacheEvict(value = "sessionsByQuery", allEntries = true)
    public SessionDTO createSession(SessionDTO sessionDTO) {
        if (sessionDTO == null) throw new IllegalArgumentException("sessionDTO required");

        if (hasConflict(sessionDTO)) {
            throw new IllegalArgumentException("Session overlaps with existing sessions.");
        }
        SessionEntity entity = toEntity(sessionDTO);
        SessionEntity saved = sessionRepository.save(entity);

        return toDto(saved);
    }

    @Transactional
    @CachePut(value = "sessions", key = "#result.id")
    @CacheEvict(value = "sessionsByQuery", allEntries = true)
    public SessionDTO updateSession(Long id, SessionDTO sessionDTO) {
        if (id == null) {
            throw new IllegalArgumentException("Session id must be provided for update.");
        }

        if (hasConflict(sessionDTO)) {
            throw new IllegalArgumentException("Session overlaps with existing sessions.");
        }

        SessionEntity existing = sessionRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Session not found: " + id));

        // apply updates
        if (sessionDTO.getTitle() != null) existing.setTitle(sessionDTO.getTitle());
        if (sessionDTO.getSpeaker() != null) existing.setSpeaker(sessionDTO.getSpeaker());
        if (sessionDTO.getPriority() != null) existing.setPriority(sessionDTO.getPriority());
        if (sessionDTO.getStartDateTime() != null) existing.setStartDateTime(sessionDTO.getStartDateTime());
        if (sessionDTO.getEndDateTime() != null) existing.setEndDateTime(sessionDTO.getEndDateTime());
        if (sessionDTO.getVip() != null) existing.setVip(sessionDTO.getVip());


        SessionEntity saved = sessionRepository.save(existing);


        return toDto(saved);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "sessions", key = "#id"),
            @CacheEvict(value = "sessionsByQuery", allEntries = true)
    })
    public void deleteSession(Long id) {
        if (id == null) return;
        SessionEntity existing = sessionRepository.findById(id).orElse(null);
        if (existing == null) return;

        sessionRepository.deleteById(id);
    }

    @Cacheable(value = "sessionsByQuery", key = "#startFrom?.toString() + ':' + #startTo?.toString() + ':' + #sortBy + ':' + #page + ':' + #size")
    public Page<SessionDTO> getSessionsForEvent(LocalDateTime startFrom, LocalDateTime startTo, String sortBy, Integer page, Integer size) {

        Sort sort;
        if ("priority".equalsIgnoreCase(sortBy)) {
            // higher priority first
            sort = Sort.by(Sort.Direction.DESC, "priority");
        } else {
            // default: by start time ascending
            sort = Sort.by(Sort.Direction.ASC, "startDateTime");
        }

        Pageable pageable = PageRequest.of(page == null ? 0 : page, size == null ? 20 : size, sort);

        Specification<SessionEntity> spec = (root, query, cb) -> cb.conjunction();

        if (startFrom != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("startDateTime"), startFrom));
        }

        if (startTo != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("startDateTime"), startTo));
        }

        return sessionRepository.findAll(spec, pageable).map(this::toDto);
    }

    /**
     * Checks the 'sessions' cache for any session that overlaps candidate's time range.
     * This version runs per-entry checks in parallel using a thread pool.
     * If excludeId is non-null, that id will be ignored (useful for updates).
     */
    @SuppressWarnings("unchecked")
    private boolean hasConflict(SessionDTO candidate) {
        if (candidate == null) return false;
        LocalDateTime cStart = candidate.getStartDateTime();
        LocalDateTime cEnd = candidate.getEndDateTime();
        if (cStart == null || cEnd == null) return false;

        Cache cache = cacheManager.getCache("sessions");
        if (cache == null) return false;

        Object nativeCache = cache.getNativeCache();
        if (nativeCache instanceof com.github.benmanes.caffeine.cache.Cache) {
            com.github.benmanes.caffeine.cache.Cache<Object, Object> caffeine =
                    (com.github.benmanes.caffeine.cache.Cache<Object, Object>) nativeCache;
            Map<Object, Object> asMap = caffeine.asMap();
            if (asMap.isEmpty()) return false;

            List<Callable<Boolean>> tasks = getCallables(asMap, cEnd, cStart,candidate.getId());

            try {
                List<Future<Boolean>> futures = validatorPool.invokeAll(tasks);
                for (Future<Boolean> f : futures) {
                    try {
                        if (f.get()) {
                            return true;
                        }
                    } catch (ExecutionException ee) {
                        // ignore task exceptions and continue checking others
                    }
                }
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                return false;
            }
        }
        // fallback: cannot inspect cache entries -> assume no conflict
        return false;
    }

    private List<Callable<Boolean>> getCallables(Map<Object, Object> asMap, LocalDateTime cEnd, LocalDateTime cStart, Long id) {
        List<Callable<Boolean>> tasks = new ArrayList<>(asMap.size());
        for (Object val : asMap.values()) {
            tasks.add(() -> {
                SessionDTO s = extractSessionDTO(val);
                if (s == null) return false;
                if (s.getId().longValue() == id.longValue()) return false;
                LocalDateTime sStart = s.getStartDateTime();
                LocalDateTime sEnd = s.getEndDateTime();
                if (sStart == null || sEnd == null) return false;
                // overlap if existing.start < candidate.end && existing.end > candidate.start
                return sStart.isBefore(cEnd) && sEnd.isAfter(cStart);
            });
        }
        return tasks;
    }


    private SessionDTO extractSessionDTO(Object cachedValue) {
        switch (cachedValue) {
            case null -> {
                return null;
            }
            case SessionDTO sessionDTO -> {
                return sessionDTO;
            }
            case org.springframework.cache.support.SimpleValueWrapper simpleValueWrapper -> {
                Object inner = simpleValueWrapper.get();
                if (inner instanceof SessionDTO) return (SessionDTO) inner;
            }
            default -> {
            }
        }
        return null;
    }


    private SessionEntity toEntity(SessionDTO dto) {
        if (dto == null) return null;
        SessionEntity e = new SessionEntity();
        e.setId(dto.getId());
        e.setTitle(dto.getTitle());
        e.setSpeaker(dto.getSpeaker());
        e.setPriority(dto.getPriority());
        e.setStartDateTime(dto.getStartDateTime());
        e.setEndDateTime(dto.getEndDateTime());
        e.setVip(dto.getVip());
        return e;
    }

    private SessionDTO toDto(SessionEntity e) {
        return new SessionDTO(e.getId(), e.getTitle(), e.getSpeaker(), e.getPriority(), e.getStartDateTime(), e.getEndDateTime(), e.getVip());
    }
}
