import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

class BattleNetAPI {
  public region: string;
  private accessToken: string | null = null;
  private tokenExpiration: number = 0;

  constructor() {
    this.region = process.env.BNET_REGION || "eu";
    if (!this.region) {
      throw new Error("BNET_REGION is not defined in environment variables");
    }
  }

  async getAuthorizationUrl() {
    const clientId = process.env.BNET_CLIENT_ID;
    if (!clientId) {
      throw new Error("BNET_CLIENT_ID is not defined in environment variables");
    }
    const redirectUri = encodeURIComponent(
      "http://localhost:3000/auth/callback"
    );
    const scope = encodeURIComponent("wow.profile");
    const state = this.generateRandomState();
    const authUrl = `https://${this.region}.battle.net/oauth/authorize?client_id=${clientId}&scope=${scope}&response_type=code&redirect_uri=${redirectUri}&state=${state}`;
    return { authUrl, state };
  }

  private generateRandomState(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  async getAccessToken(code: string): Promise<string> {
    const clientId = process.env.BNET_CLIENT_ID;
    const clientSecret = process.env.BNET_CLIENT_SECRET;
    const redirectUri = process.env.BNET_CALLBACK_URL;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("Missing required environment variables");
    }

    try {
      const response = await axios.post(
        `https://${this.region}.battle.net/oauth/token`,
        null,
        {
          params: {
            grant_type: "authorization_code",
            code,
            redirect_uri: redirectUri,
          },
          auth: {
            username: clientId,
            password: clientSecret,
          },
        }
      );

      return response.data.access_token;
    } catch (error) {
      console.error("Error getting access token:", error);
      throw error;
    }
  }

  public async ensureValidToken(): Promise<string> {
    if (!this.accessToken || Date.now() >= this.tokenExpiration) {
      const clientId = process.env.BNET_CLIENT_ID;
      const clientSecret = process.env.BNET_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error("Missing required environment variables");
      }

      try {
        const response = await axios.post(
          `https://${this.region}.battle.net/oauth/token`,
          null,
          {
            params: {
              grant_type: "client_credentials",
            },
            auth: {
              username: clientId,
              password: clientSecret,
            },
          }
        );

        this.accessToken = response.data.access_token;
        this.tokenExpiration = Date.now() + response.data.expires_in * 1000;
      } catch (error) {
        console.error("Error getting client credentials token:", error);
        throw error;
      }
    }

    if (!this.accessToken) {
      throw new Error("Failed to obtain access token");
    }

    return this.accessToken;
  }

  
}

export default new BattleNetAPI();
