import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const userId = body.userId;

    if (!userId) {
      return Response.json({ error: 'userId required' }, { status: 400 });
    }

    // Delete UserProfile
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({ userId });
    for (const p of profiles) {
      await base44.asServiceRole.entities.UserProfile.delete(p.id);
    }

    // Delete ProviderService
    const services = await base44.asServiceRole.entities.ProviderService.filter({ providerId: userId });
    for (const s of services) {
      await base44.asServiceRole.entities.ProviderService.delete(s.id);
    }

    // Delete ServiceRequest and related
    const requests = await base44.asServiceRole.entities.ServiceRequest.filter({ created_by_id: userId });
    for (const r of requests) {
      const msgs = await base44.asServiceRole.entities.Message.filter({ conversationId: r.id });
      for (const m of msgs) {
        await base44.asServiceRole.entities.Message.delete(m.id);
      }
      const convs = await base44.asServiceRole.entities.Conversation.filter({ serviceRequestId: r.id });
      for (const c of convs) {
        await base44.asServiceRole.entities.Conversation.delete(c.id);
      }
      const interests = await base44.asServiceRole.entities.ServiceRequestInterest.filter({ serviceRequestId: r.id });
      for (const i of interests) {
        await base44.asServiceRole.entities.ServiceRequestInterest.delete(i.id);
      }
      await base44.asServiceRole.entities.ServiceRequest.delete(r.id);
    }

    // Delete Conversation as provider
    const convAsProvider = await base44.asServiceRole.entities.Conversation.filter({ providerId: userId });
    for (const c of convAsProvider) {
      const msgs = await base44.asServiceRole.entities.Message.filter({ conversationId: c.id });
      for (const m of msgs) {
        await base44.asServiceRole.entities.Message.delete(m.id);
      }
      await base44.asServiceRole.entities.Conversation.delete(c.id);
    }

    // Delete Reviews
    const reviews = await base44.asServiceRole.entities.ProviderReview.filter({ providerId: userId });
    for (const r of reviews) {
      await base44.asServiceRole.entities.ProviderReview.delete(r.id);
    }

    // Delete Notifications
    const notifs = await base44.asServiceRole.entities.Notification.filter({ userId });
    for (const n of notifs) {
      await base44.asServiceRole.entities.Notification.delete(n.id);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});