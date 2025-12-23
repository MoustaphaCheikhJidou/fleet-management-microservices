package com.iam.service.application.internal.outboundservices.mail;

import java.time.Instant;

/**
 * Simplified mail contract used by the IAM service.
 */
public interface MailNotificationService {

    void sendActivationEmail(String to, String fullName, String activationToken, Instant expiresAt);

    void sendPasswordChangedEmail(String to, String fullName);
}
