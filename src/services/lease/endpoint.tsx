/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpService } from "../index";

class ConnectionBaseService extends HttpService {
  private readonly prefix: string = "api/v1/connections";

  /**
   * List all connections with optional filters
   */

    listConnections = (): Promise<any> => this.get(this.prefix + `/`, {});

  /**
   * Create a new connection
   */
  createConnection = (data: {
    credentialId: string;
    label?: string;
    scope: "read" | "trade";
    account?: string;
  }): Promise<any> => this.post(this.prefix, data);

  /**
   * Pause a connection
   */
  pauseConnection = (id: string): Promise<any> => 
    this.post(`${this.prefix}/${id}/pause`, {});

  /**
   * Resume a connection
   */
  resumeConnection = (id: string): Promise<any> => 
    this.post(`${this.prefix}/${id}/resume`, {});

  /**
   * Sync a connection immediately
   */
  syncConnection = (id: string): Promise<any> => 
    this.post(`${this.prefix}/${id}/sync`, {});

  /**
   * Remove/delete a connection
   */
  removeConnection = (id: string): Promise<any> => 
    this.delete(`${this.prefix}/${id}`, {});

  /**
   * Bulk pause connections
   */
  bulkPauseConnections = (ids: string[]): Promise<any> => 
    this.post(`${this.prefix}/bulk/pause`, { ids });

  /**
   * Bulk resume connections
   */
  bulkResumeConnections = (ids: string[]): Promise<any> => 
    this.post(`${this.prefix}/bulk/resume`, { ids });

  /**
   * Bulk remove connections
   */
  bulkRemoveConnections = (ids: string[]): Promise<any> => 
    this.post(`${this.prefix}/bulk/remove`, { ids });
}

export const connectionService = new ConnectionBaseService();