package com.traininginsights.dto;

public class GroupDtos {
    public static class GroupDTO {
        public Long id;
        public String name;
        public Long[] clubIds;
        public Long[] trainerIds;
        public Long[] athleteIds;
    }

    public static class CreateGroupRequest {
        public String name;
        public Long[] clubIds;
        public Long[] trainerIds;
    }

    public static class UpdateGroupRequest {
        public String name;
        public Long[] clubIds;
        public Long[] trainerIds;
    }
}
