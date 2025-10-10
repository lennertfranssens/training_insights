package com.traininginsights.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.traininginsights.model.PushSubscription;
import com.traininginsights.model.PushConfig;
import com.traininginsights.repository.PushSubscriptionRepository;
import com.traininginsights.repository.PushConfigRepository;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.Subscription;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Security;

@Service
public class PushService {
    private final PushSubscriptionRepository repo;
    private String vapidPublic;
    private String vapidPrivate;
    private String vapidSubject;
    private final PushConfigRepository configRepo;
    private final ObjectMapper mapper = new ObjectMapper();

    public PushService(PushSubscriptionRepository repo,
                       PushConfigRepository configRepo,
                       @Value("${vapid.public:}") String vapidPublic,
                       @Value("${vapid.private:}") String vapidPrivate,
                       @Value("${vapid.subject:mailto:admin@localhost}") String vapidSubject){
        this.repo = repo;
        this.configRepo = configRepo;
        this.vapidPublic = vapidPublic;
        this.vapidPrivate = vapidPrivate;
        this.vapidSubject = vapidSubject;
        // Ensure BouncyCastle provider is registered for EC crypto used by web-push (safe to call multiple times)
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        // If env not set, attempt an initial read from DB
        refreshFromDbIfMissing();
    }

    private void refreshFromDbIfMissing(){
        if ((this.vapidPublic == null || this.vapidPublic.isBlank()) || (this.vapidPrivate == null || this.vapidPrivate.isBlank()) || (this.vapidSubject == null || this.vapidSubject.isBlank())){
            try {
                var opt = configRepo.findTopByOrderByIdDesc();
                if (opt.isPresent()){
                    PushConfig c = opt.get();
                    if (this.vapidPublic == null || this.vapidPublic.isBlank()) this.vapidPublic = c.getVapidPublic();
                    if (this.vapidPrivate == null || this.vapidPrivate.isBlank()) this.vapidPrivate = c.getVapidPrivate();
                    if (this.vapidSubject == null || this.vapidSubject.isBlank()) this.vapidSubject = c.getSubject();
                }
            } catch (Exception ignored){}
        }
    }

    public PushSubscription save(PushSubscription s){ return repo.save(s); }
    public void delete(Long id){ repo.deleteById(id); }

    /**
     * Core sender that returns an HTTP-like status code for diagnostics.
     * Returns null if VAPID keys are missing (logged-only), -1 on exception, or the provider's status code when available.
     */
    public Integer sendNotificationWithStatus(PushSubscription s, String payload){
        try {
            // attempt to lazily load keys if missing
            refreshFromDbIfMissing();
            if (vapidPublic == null || vapidPublic.isBlank() || vapidPrivate == null || vapidPrivate.isBlank()){
                System.out.println("[PushService] VAPID keys not configured; logging notification instead. endpoint="+s.getEndpoint()+" payload="+payload);
                return null; // indicates log-only
            }

            // parse keys JSON (expects {"p256dh":"...","auth":"..."})
            JsonNode node = mapper.readTree(s.getKeys());
            String p256dh = node.has("p256dh") ? node.get("p256dh").asText() : null;
            String auth = node.has("auth") ? node.get("auth").asText() : null;
            if (p256dh == null || auth == null) {
                System.out.println("[PushService] Invalid subscription keys for subscription id="+s.getId());
                return -1;
            }

            Subscription.Keys keys = new Subscription.Keys(p256dh, auth);
            Subscription sub = new Subscription(s.getEndpoint(), keys);

            nl.martijndwars.webpush.PushService webPush = new nl.martijndwars.webpush.PushService();
            webPush.setSubject(vapidSubject);
            webPush.setPublicKey(vapidPublic);
            webPush.setPrivateKey(vapidPrivate);

            Notification notification = new Notification(sub, payload == null ? "" : payload);
            var resp = webPush.send(notification);
            String host = null;
            try {
                java.net.URI endpointUri = java.net.URI.create(s.getEndpoint());
                host = endpointUri.getHost();
            } catch (Exception ignored) {}
            Integer code = null;
            if (resp != null) {
                code = resp.getStatusLine().getStatusCode();
                if (code == 404 || code == 410) {
                    // subscription is gone; clean up
                    try { repo.deleteById(s.getId()); } catch (Exception ignored) {}
                    System.out.println("[PushService] Removed expired subscription id="+s.getId()+" status="+code+" host="+host);
                }
            }
            System.out.println("[PushService] Push result subId="+s.getId()+" host="+host+" status="+(code==null?"(none)":code));
            return code == null ? 0 : code;
        } catch (Exception e){
            System.out.println("[PushService] Error sending push notification to subscription id="+s.getId()+" : " + e.getMessage());
            return -1;
        }
    }

    /** Compatibility wrapper without status reporting */
    public void sendNotification(PushSubscription s, String payload){
        sendNotificationWithStatus(s, payload);
    }

    /**
     * Structured payload variant: send JSON with title/body/url so the service worker can render a richer notification.
     */
    public Integer sendNotificationStatus(PushSubscription s, String title, String body, String url){
        try {
            var obj = new java.util.LinkedHashMap<String, Object>();
            if (title != null) obj.put("title", title);
            if (body != null) obj.put("body", body);
            if (url != null && !url.isBlank()) obj.put("url", url);
            String json = mapper.writeValueAsString(obj);
            return sendNotificationWithStatus(s, json);
        } catch (Exception e){
            // fallback to text
            return sendNotificationWithStatus(s, (title == null ? "" : title) + "\n" + (body == null ? "" : body));
        }
    }

    /** Compatibility wrapper for previous callers */
    public void sendNotification(PushSubscription s, String title, String body, String url){
        sendNotificationStatus(s, title, body, url);
    }

    public String getVapidPublic(){
        refreshFromDbIfMissing();
        return vapidPublic == null ? null : vapidPublic.trim();
    }
}
