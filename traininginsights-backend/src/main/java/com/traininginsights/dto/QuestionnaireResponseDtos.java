package com.traininginsights.dto;

public class QuestionnaireResponseDtos {
    public static class SubmitResponseRequest {
        public Long trainingId; // optional when generic
        public Long questionnaireId;
        public String responses; // JSON string
    }
}
