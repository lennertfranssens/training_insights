package com.traininginsights.service;

import com.traininginsights.model.Club;
import com.traininginsights.model.EmailLog;
import com.traininginsights.repository.EmailLogRepository;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.internet.MimeMessage;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Properties;

@Service
public class EmailService {
    private final EmailLogRepository emailLogRepository;

    public EmailService(EmailLogRepository emailLogRepository){
        this.emailLogRepository = emailLogRepository;
    }

    // Build a JavaMailSenderImpl based on club SMTP settings
    private JavaMailSenderImpl buildSender(Club c){
        if (c == null) return null; // defensively handle null
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

    private void logEmail(String to, String subject, Club club){
        try {
            emailLogRepository.save(new EmailLog(to, subject, club != null ? club.getId() : null));
        } catch (Exception ignore){
            // Avoid impacting mail sending if logging fails
        }
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
            logEmail(to, subject, club);
            return true;
        } catch (Exception e){
            System.err.println("Failed to send email: " + e.getMessage());
            return false;
        }
    }

    public boolean sendBccMail(Club club, List<String> bcc, String subject, String body){
        if (bcc == null || bcc.isEmpty()) return false;
        JavaMailSenderImpl sender = buildSender(club);
        if (sender == null) return false;
        try {
            MimeMessage mime = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, false, "UTF-8");
            if (club.getSmtpFrom() != null) helper.setFrom(club.getSmtpFrom());
            helper.setSubject(subject);
            helper.setText(body, false);
            for (String addr : bcc){ helper.addBcc(addr); }
            sender.send(mime);
            // Log individually so counts reflect recipients reached
            bcc.forEach(addr -> logEmail(addr, subject, club));
            return true;
        } catch (Exception e){
            System.err.println("Failed to send BCC email: " + e.getMessage());
            return false;
        }
    }

    public boolean sendBccMailWithAttachments(Club club, List<String> bcc, String subject, String body, List<java.io.File> attachments){
        if (bcc == null || bcc.isEmpty()) return false;
        JavaMailSenderImpl sender = buildSender(club);
        if (sender == null) return false;
        try {
            MimeMessage mime = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
            if (club.getSmtpFrom() != null) helper.setFrom(club.getSmtpFrom());
            helper.setSubject(subject);
            helper.setText(body, false);
            for (String addr : bcc){ helper.addBcc(addr); }
            if (attachments != null){
                for (java.io.File f : attachments){
                    if (f != null && f.exists()){
                        helper.addAttachment(f.getName(), f);
                    }
                }
            }
            sender.send(mime);
            bcc.forEach(addr -> logEmail(addr, subject, club));
            return true;
        } catch (Exception e){
            System.err.println("Failed to send BCC email with attachments: " + e.getMessage());
            return false;
        }
    }

    public boolean sendHtmlMail(Club club, String to, String subject, String htmlBody, String textFallback){
        JavaMailSenderImpl sender = buildSender(club);
        if (sender == null) return false;
        try {
            MimeMessage mime = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
            if (club.getSmtpFrom() != null) helper.setFrom(club.getSmtpFrom());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(textFallback != null ? textFallback : htmlBody.replaceAll("<[^>]+>", ""), htmlBody);
            sender.send(mime);
            logEmail(to, subject, club);
            return true;
        } catch (Exception e){
            System.err.println("Failed to send HTML email: " + e.getMessage());
            return false;
        }
    }
}
