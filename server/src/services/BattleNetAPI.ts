import axios from "axios";
import dotenv from "dotenv";
import { SECRETS } from '../config/config';

dotenv.config();

class BattleNetAPI {
  private readonly API_DOMAIN = "api.blizzard.com";
  public region: string;
  private accessToken: string | null = null;
  private tokenExpiration: number = 0;

  constructor() {
    this.region = SECRETS.BNET.REGION;
    if (!this.region) {
      throw new Error("BNET_REGION is not defined");
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
  ): Promise<{ token: string; refreshToken: string }> {
    const credentials = Buffer.from(
      `${SECRETS.BNET.CLIENT_ID}:${SECRETS.BNET.CLIENT_SECRET}`
    ).toString("base64");

    const response = await axios.post(
      `https://${SECRETS.BNET.REGION.toLowerCase()}.battle.net/oauth/token`,
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: SECRETS.BNET.CALLBACK_URL,
        scope: "wow.profile",
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      }
    );

    return {
      token: response.data.access_token,
      refreshToken: response.data.refresh_token,
    };
  }

  public async ensureValidToken(): Promise<string> {
    if (!this.accessToken || Date.now() >= this.tokenExpiration) {
      try {
        const response = await axios.post(
          `https://${this.region}.battle.net/oauth/token`,
          new URLSearchParams({
            grant_type: "client_credentials",
          }).toString(),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "Authorization": `Basic ${Buffer.from(
                `${SECRETS.BNET.CLIENT_ID}:${SECRETS.BNET.CLIENT_SECRET}`
              ).toString("base64")}`
            }
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
      console.log('Validating token with Battle.net');
      await axios.get(`https://${this.region}.battle.net/oauth/check_token`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('Token validation successful');
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Token validation failed:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      } else {
        console.error("Error validating token:", error);
      }
      return false;
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{ token: string; refreshToken: string; expiresIn: number }> {
    const tokenUrl = `https://${this.region}.battle.net/oauth/token`;
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: SECRETS.BNET.CLIENT_ID,
      client_secret: SECRETS.BNET.CLIENT_SECRET,
    });

    try {
      const response = await axios.post(tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return {
        token: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
      };
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }

  public getAuthorizationUrl(callback: string, state: string): string {
    const params = new URLSearchParams({
      client_id: SECRETS.BNET.CLIENT_ID,
      redirect_uri: callback,
      response_type: 'code',
      state: state,
      scope: 'wow.profile'
    });

    return `https://${this.region}.battle.net/oauth/authorize?${params.toString()}`;
  }
}

export default new BattleNetAPI();
