import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

class BattleNetAPI {
  private readonly API_DOMAIN = "api.blizzard.com";
  public region: string;
  private accessToken: string | null = null;
  private tokenExpiration: number = 0;

  constructor() {
    this.region = process.env.BNET_REGION || "eu";
    if (!this.region) {
      throw new Error("BNET_REGION is not defined in environment variables");
    }
  }

  public async makeRequest<T>(
    endpoint: string,
    params = {},
    namespace?: string
  ): Promise<T> {
    const token = await this.ensureValidToken();
    
    // Determine the correct namespace
    let defaultNamespace = "static";
    if (endpoint.includes("/profile/")) {
      defaultNamespace = "profile";
    } else if (endpoint.includes("mythic-keystone")) {
      defaultNamespace = "dynamic";
    }

    try {
      const response = await axios.get<T>(
        `https://${this.region}.${this.API_DOMAIN}${endpoint}`,
        {
          params: {
            ...params,
            namespace: `${namespace || defaultNamespace}-${this.region}`,
            locale: "en_US",
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error making request to ${endpoint}:`, error);
      throw error;
    }
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
      const response = await axios.post(tokenUrl, params.toString(), {
        auth: {
          username: process.env.BNET_CLIENT_ID || "",
          password: process.env.BNET_CLIENT_SECRET || "",
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      return {
        token: response.data.access_token,
        expiresIn: response.data.expires_in,
      };
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
          new URLSearchParams({
            grant_type: "client_credentials",
          }).toString(),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
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

    return this.accessToken!;
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      await axios.get(`https://${this.region}.battle.net/oauth/check_token`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return true;
    } catch (error) {
      console.error("Error validating token:", error);
      return false;
    }
  }
}

export default new BattleNetAPI();
