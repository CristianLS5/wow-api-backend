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

  async getAccessToken(
    code: string
  ): Promise<{ token: string; expiresIn: number }> {
    const tokenUrl = `https://${this.region}.battle.net/oauth/token`;
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: process.env.BNET_CALLBACK_URL || "",
    });

    try {
      const response = await axios.post(tokenUrl, params, {
        auth: {
          username: process.env.BNET_CLIENT_ID || "",
          password: process.env.BNET_CLIENT_SECRET || "",
        },
      });

      return {
        token: response.data.access_token,
        expiresIn: response.data.expires_in,
      };
    } catch (error) {
      console.error("Error getting access token:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Battle.net API error response:", {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        });
      }
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

  async validateToken(token: string): Promise<boolean> {
    const tokenUrl = `https://${this.region}.battle.net/oauth/check_token`;

    try {
      const response = await axios.post(
        tokenUrl,
        { token },
        {
          auth: {
            username: process.env.BNET_CLIENT_ID || "",
            password: process.env.BNET_CLIENT_SECRET || "",
          },
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      console.log("Token validation response:", response.data);
      // The token is valid if we get a successful response
      return true;
    } catch (error) {
      console.error("Error validating token:", error);
      // If there's an error, the token is likely invalid
      return false;
    }
  }
}

export default new BattleNetAPI();
