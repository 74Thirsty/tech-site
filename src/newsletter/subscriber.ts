export type Subscriber = { email:string; source:"newsletter"|"book"|"mission"; createdAt:string; status:"active"|"unsubscribed" };
export function normalizeSubscriber(email:string): Subscriber { return {email:email.trim().toLowerCase(),source:"newsletter",createdAt:new Date().toISOString(),status:"active"}; }
