import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from "@nestjs/common";
import { Response } from "express";
import { EmailsService, TRACKING_PIXEL } from "./emails.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, WorkspaceId } from "../common/decorators/current-user.decorator";

@Controller("emails")
export class EmailsController {
  constructor(private emailsService: EmailsService) {}

  // ─── Protected routes ──────────────────────────────────────────────────────

  @Get("logs")
  @UseGuards(JwtAuthGuard)
  getLogs(
    @CurrentUser() user: any,
    @WorkspaceId() wid: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.emailsService.getLogs(wid, user.id, page, limit);
  }

  @Get("stats")
  @UseGuards(JwtAuthGuard)
  getStats(@CurrentUser() user: any, @WorkspaceId() wid: string) {
    return this.emailsService.getWorkspaceStats(wid, user.id);
  }

  // ─── Public routes (no auth) ───────────────────────────────────────────────

  @Get("track/:id")
  async trackOpen(@Param("id") id: string, @Res() res: Response) {
    await this.emailsService.recordOpen(id);
    res.set("Content-Type", "image/gif");
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Pragma", "no-cache");
    res.send(TRACKING_PIXEL);
  }

  @Get("unsubscribe/:token")
  async unsubscribe(@Param("token") token: string, @Res() res: Response) {
    try {
      const { email } = await this.emailsService.unsubscribeLead(token);
      res.set("Content-Type", "text/html");
      res.send(`
        <html><body style="font-family:sans-serif;max-width:500px;margin:80px auto;text-align:center">
          <h2>Unsubscribed</h2>
          <p>${email} has been removed from all future emails.</p>
        </body></html>
      `);
    } catch {
      res.status(404).set("Content-Type", "text/html").send(`
        <html><body style="font-family:sans-serif;max-width:500px;margin:80px auto;text-align:center">
          <h2>Invalid link</h2>
          <p>This unsubscribe link is not valid.</p>
        </body></html>
      `);
    }
  }
}
