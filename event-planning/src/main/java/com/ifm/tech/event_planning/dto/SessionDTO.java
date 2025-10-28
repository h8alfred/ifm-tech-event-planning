package com.ifm.tech.event_planning.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.ifm.tech.event_planning.validation.ValidSessionTime;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "SessionDTO", description = "Data transfer object representing an event session")
@ValidSessionTime
public class SessionDTO {

    @Schema(description = "Unique session identifier", example = "1", accessMode = Schema.AccessMode.READ_ONLY)
    private Long id;

    @NotBlank
    @Schema(description = "Session title", example = "Keynote: The Future of Tech")
    private String title;

    @Schema(description = "Name of the session speaker", example = "Jane Doe")
    private String speaker;

    @NotNull
    @Min(0)
    @Schema(description = "Priority of the session (higher means more important)", example = "1")
    private Integer priority;

    @NotNull
    @Schema(description = "Session start date and time in ISO-8601 format", example = "2025-10-21T09:00:00")
    private LocalDateTime startDateTime;

    @NotNull
    @Schema(description = "Session end date and time in ISO-8601 format", example = "2025-10-21T10:00:00")
    private LocalDateTime endDateTime;

    @NotNull
    @Schema(description = "Indicates if the session is for VIP attendees", example = "true")
    private Boolean vip;
}
