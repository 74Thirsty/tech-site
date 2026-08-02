export function personalizeSubject(subject:string,profile?:{displayName?:string;topics?:string[]}){return profile?.displayName ? `${profile.displayName}, ${subject}` : subject;}
