package com.ifm.tech.event_planning.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import com.ifm.tech.event_planning.dto.SessionDTO;
import java.time.LocalDateTime;

public class ValidSessionTimeValidator implements ConstraintValidator<ValidSessionTime, SessionDTO> {

    @Override
    public boolean isValid(SessionDTO dto, ConstraintValidatorContext context) {
        if (dto == null) {
            return true; // other @NotNull constraints handle null DTO if needed
        }
        LocalDateTime start = dto.getStartDateTime();
        LocalDateTime end = dto.getEndDateTime();

        if (start == null || end == null) {
            return true; // let field-level @NotNull produce messages for missing values
        }

        return end.isAfter(start);
    }
}
