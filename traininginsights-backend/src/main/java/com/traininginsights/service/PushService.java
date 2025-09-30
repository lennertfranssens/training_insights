package com.traininginsights.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.traininginsights.model.PushSubscription;
import com.traininginsights.model.PushConfig;
import com.traininginsights.repository.PushSubscriptionRepository;
import com.traininginsights.repository.PushConfigRepository;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.Subscription;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

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
    // if env not set, attempt to read from DB
        if ((this.vapidPublic == null || this.vapidPublic.isBlank()) || (this.vapidPrivate == null || this.vapidPrivate.isBlank())){
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
     * Send a web-push notification using the web-push library when VAPID keys are configured.
     * If VAPID keys are missing or sending fails, fall back to logging.
     */
    public void sendNotification(PushSubscription s, String payload){
        try {
            if (vapidPublic == null || vapidPublic.isBlank() || vapidPrivate == null || vapidPrivate.isBlank()){
                System.out.println("[PushService] VAPID keys not configured; logging notification instead. endpoint="+s.getEndpoint()+" payload="+payload);
                return;
            }

            // parse keys JSON (expects {"p256dh":"...","auth":"..."})
            JsonNode node = mapper.readTree(s.getKeys());
            String p256dh = node.has("p256dh") ? node.get("p256dh").asText() : null;
            String auth = node.has("auth") ? node.get("auth").asText() : null;
            if (p256dh == null || auth == null) {
                System.out.println("[PushService] Invalid subscription keys for subscription id="+s.getId());
                return;
            }

            Subscription.Keys keys = new Subscription.Keys(p256dh, auth);
            Subscription sub = new Subscription(s.getEndpoint(), keys);

            nl.martijndwars.webpush.PushService webPush = new nl.martijndwars.webpush.PushService();
            webPush.setSubject(vapidSubject);
            webPush.setPublicKey(vapidPublic);
            webPush.setPrivateKey(vapidPrivate);

            Notification notification = new Notification(sub, payload == null ? "" : payload);
            webPush.send(notification);
            System.out.println("[PushService] Sent web-push to subscription id="+s.getId());
        } catch (Exception e){
            System.out.println("[PushService] Error sending push notification to subscription id="+s.getId()+" : " + e.getMessage());
        }
    }

    public String getVapidPublic(){ return vapidPublic; }
}
