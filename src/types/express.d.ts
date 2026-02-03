declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      telegram_id?: number;
      email?: string;
    };
  }
}
