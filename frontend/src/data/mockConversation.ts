import { AssistantProfile, Message } from '../types';

export const assistantProfiles: Record<AssistantProfile['id'], AssistantProfile> = {
  kubera: { id: 'kubera', name: 'Kubera', avatarUrl: '/kubera.png', gender: 'Male' },
  kanchana: { id: 'kanchana', name: 'Kanchana', avatarUrl: '/kanchana.jpg', gender: 'Female' }
};


export const mockConversation: Message[] = [
{
  id: 'm1',
  sender: 'assistant',
  senderName: 'Kubera',
  text: "Hi Rahul! You're verified. How can I help you today?",
  timestamp: '10:24 AM'
},
{
  id: 'm2',
  sender: 'user',
  senderName: 'Rahul Mehta',
  text: "What's my current balance?",
  timestamp: '10:24 AM'
},
{
  id: 'm3',
  sender: 'assistant',
  senderName: 'Kubera',
  text: 'Your available balance is ₹84,320, as of this morning. Anything else?',
  timestamp: '10:24 AM'
},
{
  id: 'm4',
  sender: 'user',
  senderName: 'Rahul Mehta',
  text: "No, that's all, thanks.",
  timestamp: '10:24 AM'
},
{
  id: 'm5',
  sender: 'assistant',
  senderName: 'Kubera',
  text: 'Glad I could help. Ending the call now — have a good day.',
  timestamp: '10:25 AM'
}];


export const scriptedReplies: string[] = [
'Let me check that for you — one moment.',
'Your available balance is ₹84,320, as of this morning. Anything else?',
'Your next EMI of ₹12,450 is due on 28 September.',
'Glad I could help. Anything else you would like to review?'];
