package com.traininginsights.dto;

import java.time.Instant;

public class MembershipDto {
    public Long id;
    public Long userId;
    public String userFirstName;
    public String userLastName;
    public String userEmail;
    public Long clubId;
    public String clubName;
    public Long seasonId;
    public String seasonName;
    public Instant startDate;
    public Instant endDate;
    public String status;
}
