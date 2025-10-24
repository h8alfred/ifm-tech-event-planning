package com.ifm.tech.event_planning.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;
import static java.lang.annotation.ElementType.TYPE;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

@Documented
@Target({ TYPE })
@Retention(RUNTIME)
@Constraint(validatedBy = ValidSessionTimeValidator.class)
public @interface ValidSessionTime {
    String message() default "endDateTime must be after startDateTime";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
