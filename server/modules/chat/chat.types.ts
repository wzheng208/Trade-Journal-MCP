export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type RunChatInput = {
  userId: string;
  messages: ChatMessage[];
};

export type RunChatResult = {
  message: {
    role: 'assistant';
    content: string;
  };
};
