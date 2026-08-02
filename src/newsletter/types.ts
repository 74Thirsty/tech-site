export type NewsletterStatus = "DRAFT" | "NEEDS_REVIEW" | "READY" | "SENT";
export type NewsletterIssue = { id:string; subject:string; status:NewsletterStatus; topics:string[]; openRate:number; clickRate:number; revenue:number };
