export const identity: {
  name: string;
  url: string;
  summary: string;
  contact: string;
  sitemap: string;
  openapi: string;
  trainingAllowed: boolean;
  updatedAt: string;
  excludedPaths: string[];
};
export const routes: Array<{
  path: string;
  url: string;
  md: string;
  title: string;
  description: string;
}>;
export function handleReadability(request: Request): Promise<Response | null>;
export function robots(): string;
export function publicResponse(request: Request, response: Response): Response;
export function wantsMarkdown(request: Request): boolean;
