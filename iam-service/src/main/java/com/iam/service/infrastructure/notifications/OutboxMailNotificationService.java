package com.iam.service.infrastructure.notifications;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.iam.service.application.internal.outboundservices.mail.MailNotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class OutboxMailNotificationService implements MailNotificationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(OutboxMailNotificationService.class);

    private final Path outboxDir;
    private final String from;
    private final String frontendBaseUrl;
    private final JavaMailSender mailSender;
    private final ObjectMapper objectMapper;

    public OutboxMailNotificationService(@Value("${app.mail.outbox-path:/tmp/fleet_outbox}") String outboxPath,
                                         @Value("${app.mail.from:no-reply@fleet.local}") String from,
                                         @Value("${app.frontend.base-url:http://localhost:4173}") String frontendBaseUrl,
                                         JavaMailSender mailSender,
                                         ObjectMapper objectMapper) {
        this.outboxDir = Paths.get(outboxPath);
        this.from = from;
        this.frontendBaseUrl = frontendBaseUrl != null && frontendBaseUrl.endsWith("/")
                ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1)
                : frontendBaseUrl;
        this.mailSender = mailSender;
        this.objectMapper = objectMapper;
    }

    @Override
    public void sendActivationEmail(String to, String fullName, String activationToken, Instant expiresAt) {
        var link = buildResetLink(activationToken);
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "activation");
        payload.put("to", to);
        payload.put("from", from);
        payload.put("subject", "Activez votre compte FleetOS");
        payload.put("activationLink", link);
        payload.put("token", activationToken);
        payload.put("expiresAt", expiresAt != null ? expiresAt.toString() : null);
        payload.put("displayName", fullName);
        payload.put("message", "Cliquez sur le lien pour définir votre mot de passe. Ce lien expirera bientôt.");
        writeOutbox(payload);
        sendMail(to, (String) payload.get("subject"), buildActivationBody(link, fullName, expiresAt));
    }

    @Override
    public void sendPasswordChangedEmail(String to, String fullName) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "password-changed");
        payload.put("to", to);
        payload.put("from", from);
        payload.put("subject", "Mot de passe mis à jour");
        payload.put("displayName", fullName);
        payload.put("message", "Votre mot de passe a été modifié. Si vous n'êtes pas à l'origine de cette action, contactez immédiatement l'administrateur.");
        writeOutbox(payload);
        sendMail(to, (String) payload.get("subject"), buildPasswordChangedBody(fullName));
    }

    private String buildResetLink(String token) {
        String safeToken = URLEncoder.encode(token, StandardCharsets.UTF_8);
        return String.format("%s/reset-password?token=%s", frontendBaseUrl, safeToken);
    }

    private void writeOutbox(Map<String, Object> payload) {
        try {
            Files.createDirectories(outboxDir);
            var fileName = String.format("mail-%d-%s.json", Instant.now().toEpochMilli(), UUID.randomUUID());
            Path target = outboxDir.resolve(fileName);
            objectMapper.writeValue(target.toFile(), payload);
        } catch (Exception e) {
            LOGGER.warn("Failed to persist outbox email for {}", payload.getOrDefault("to", "n/a"));
        }
    }

    private void sendMail(String to, String subject, String content) {
        if (mailSender == null) return;
        try {
            var message = new SimpleMailMessage();
            message.setTo(to);
            message.setFrom(from);
            message.setSubject(subject);
            message.setText(content);
            mailSender.send(message);
        } catch (Exception e) {
            LOGGER.warn("SMTP send failed for {}", to, e);
        }
    }

    private String buildActivationBody(String link, String fullName, Instant expiresAt) {
        String expiry = expiresAt != null ? expiresAt.toString() : "bientôt";
        return String.format("Bonjour %s,%n%nUn administrateur vous a invité sur FleetOS. Définissez votre mot de passe via:%n%s%n%nCe lien expirera: %s%n%nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
                fullName == null ? "" : fullName,
                link,
                expiry);
    }

    private String buildPasswordChangedBody(String fullName) {
        return String.format("Bonjour %s,%n%nVotre mot de passe FleetOS a été modifié. Si vous n'êtes pas à l'origine de cette action, contactez immédiatement l'administrateur.",
                fullName == null ? "" : fullName);
    }
}
