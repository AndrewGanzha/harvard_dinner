declare namespace Express {
  export interface Request {
    user?: {
      telegram_id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
  }
}
