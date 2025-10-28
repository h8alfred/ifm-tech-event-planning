package com.ifm.tech.event_planning.controller;

import com.ifm.tech.event_planning.dto.SessionDTO;
import com.ifm.tech.event_planning.service.SessionService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/events")
@Validated
public class EventSessionController {

    private final SessionService sessionService;

    public EventSessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @GetMapping(value = "/sessions", produces = MediaType.APPLICATION_JSON_VALUE)
    public Page<SessionDTO> getSessionsForEvent(
            @RequestParam(required = false) String startFrom,    // ISO-8601, e.g. 2025-10-21T09:00:00
            @RequestParam(required = false) String startTo,      // ISO-8601
            @RequestParam(required = false) String sortBy,       // "priority" or "startTime"
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        LocalDateTime from = parseIso(startFrom);
        LocalDateTime to = parseIso(startTo);

        String normalizedSort = sortBy;
        if (("startTime".equalsIgnoreCase(sortBy) || "startDateTime".equalsIgnoreCase(sortBy))) {
            normalizedSort = "startDateTime";
        }

        return sessionService.getSessionsForEvent(from, to, normalizedSort, page, size);
    }

    @PostMapping(value = "/sessions", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SessionDTO> createSession(
            @Valid @RequestBody SessionDTO sessionDTO
    ) {
        if (sessionDTO == null) return ResponseEntity.badRequest().build();
        SessionDTO created = sessionService.createSession(sessionDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping(value = "/sessions/{id}", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SessionDTO> updateSession(
            @PathVariable @Min(1) Long id,
            @Valid @RequestBody SessionDTO sessionDTO
    ) {
        if (sessionDTO == null) return ResponseEntity.badRequest().build();
        sessionDTO.setId(id);
        SessionDTO updated = sessionService.updateSession(id, sessionDTO);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping(value = "/sessions/{id}")
    public ResponseEntity<Void> deleteSession(
            @PathVariable @Min(1) Long id
    ) {
        sessionService.deleteSession(id);
        return ResponseEntity.noContent().build();
    }

    private LocalDateTime parseIso(String iso) {
        if (iso == null || iso.isBlank()) return null;
        try {
            return LocalDateTime.parse(iso);
        } catch (Exception e) {
            return null;
        }
    }
}
