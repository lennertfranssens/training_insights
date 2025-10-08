package com.traininginsights;

import com.traininginsights.model.Questionnaire;
import com.traininginsights.repository.QuestionnaireRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class QuestionnaireStructureTest {
    @Autowired
    QuestionnaireRepository questionnaireRepository;

    @Test
    @Transactional
    void persistsAndReadsJsonStructure() {
        Questionnaire q = new Questionnaire();
        q.setTitle("Test Q");
        String json = "{\"fields\":[{\"name\":\"a\"}]}";
        q.setStructure(json);
        Questionnaire saved = questionnaireRepository.save(q);
        assertNotNull(saved.getId());
        Questionnaire fetched = questionnaireRepository.findById(saved.getId()).orElseThrow();
        assertEquals(json, fetched.getStructure());
    }

    @Test
    void rejectsNumericStructure() {
        Questionnaire q = new Questionnaire();
        q.setTitle("Bad Q");
        assertThrows(IllegalArgumentException.class, () -> q.setStructure("12345"));
    }
}
