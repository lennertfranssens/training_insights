package com.traininginsights.service;

import com.traininginsights.model.Club;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.stereotype.Service;

import java.util.Properties;

@Service
public class EmailService {
    // Build a JavaMailSenderImpl based on club SMTP settings
    private JavaMailSenderImpl buildSender(Club c){
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        if (c.getSmtpHost() == null) return null;
        sender.setHost(c.getSmtpHost());
        if (c.getSmtpPort() != null) sender.setPort(c.getSmtpPort());
        if (c.getSmtpUsername() != null) sender.setUsername(c.getSmtpUsername());
        if (c.getSmtpPassword() != null) sender.setPassword(c.getSmtpPassword());
        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", c.getSmtpUsername() != null ? "true" : "false");
        props.put("mail.smtp.starttls.enable", c.getSmtpUseTls() == null ? "true" : c.getSmtpUseTls().toString());
        props.put("mail.debug", "false");
        return sender;
    }

    public boolean sendSimpleMail(Club club, String to, String subject, String body){
        JavaMailSenderImpl sender = buildSender(club);
        if (sender == null) return false;
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(to);
            msg.setSubject(subject);
            msg.setText(body);
            if (club.getSmtpFrom() != null) msg.setFrom(club.getSmtpFrom());
            sender.send(msg);
            return true;
        } catch (Exception e){
            // log but don't throw - scheduler will continue
            System.err.println("Failed to send email: " + e.getMessage());
            return false;
        }
    }
}
