import { AssistantProfile } from '../types';

export const assistantProfiles: Record<AssistantProfile['id'], AssistantProfile> = {
  kubera: { id: 'kubera', name: 'Kubera', avatarUrl: '/kubera.png', gender: 'Male' },
  kanchana: { id: 'kanchana', name: 'Kanchana', avatarUrl: '/kanchana.jpg', gender: 'Female' }
};
