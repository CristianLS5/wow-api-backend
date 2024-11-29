import express from "express";
import axios from "axios";

const router = express.Router();

interface HealthCheckResult {
  status: "up" | "down";
  service: string;
  latency: number;
  timestamp: string;
  error?: string;
  details?: {
    callbackUrl: string;
    redirectLocation?: string;
  };
}

async function checkBattleNetTokenEndpoint(
  region: string
): Promise<HealthCheckResult> {
  const startTime = Date.now();
  try {
    const credentials = Buffer.from(
      `${process.env.BNET_CLIENT_ID}:${process.env.BNET_CLIENT_SECRET}`
    ).toString("base64");

    await axios.post(
      `https://${region}.battle.net/oauth/token`,
      new URLSearchParams({
        grant_type: "client_credentials",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    return {
      status: "up",
      service: `battle.net-token-${region}`,
      latency: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: "down",
      service: `battle.net-token-${region}`,
      latency: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkCallbackEndpoint(region: string): Promise<HealthCheckResult> {
  const startTime = Date.now();
  try {
    const callbackUrl = process.env.BNET_CALLBACK_URL;
    
    // Test 1: Verify callback URL is configured
    if (!callbackUrl) {
      throw new Error('Callback URL not configured');
    }

    // Test 2: Check if the callback URL is properly formatted
    try {
      new URL(callbackUrl);
    } catch (e) {
      throw new Error('Invalid callback URL format');
    }

    // Test 3: Verify OAuth configuration
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.BNET_CLIENT_ID!,
      scope: 'wow.profile',
      state: 'health-check',
      redirect_uri: callbackUrl
    });

    const authUrl = `https://${region}.battle.net/oauth/authorize?${params}`;
    
    // We expect a 302 redirect for a properly configured OAuth
    const response = await axios.get(authUrl, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302
    });

    return {
      status: "up",
      service: `oauth-callback-${region}`,
      latency: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      details: {
        callbackUrl,
        redirectLocation: response.headers.location
      }
    };
  } catch (error) {
    return {
      status: "down",
      service: `oauth-callback-${region}`,
      latency: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// Basic health check
router.get("/", (_req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Region-specific checks
router.get("/oauth/:region", async (req, res) => {
  const region = req.params.region.toLowerCase();
  const result = await checkBattleNetTokenEndpoint(region);
  res.json(result);
});

// Token endpoint test
router.get("/oauth/token-test", async (_req, res) => {
  const region = process.env.BNET_REGION?.toLowerCase() || "eu";
  const result = await checkBattleNetTokenEndpoint(region);
  
  // Override the service name to be more descriptive
  const response = {
    ...result,
    service: `battle.net-token-check-${region}` // Fix the service name
  };
  
  res.json(response);
});

router.get("/full", async (_req, res) => {
  try {
    const regions = ["eu", "us", "kr", "tw"];
    const results = await Promise.all([
      ...regions.map((region) => checkBattleNetTokenEndpoint(region)),
    ]);

    const allUp = results.every((result) => result.status === "up");

    res.status(allUp ? 200 : 503).json({
      status: allUp ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      services: results,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/oauth/callback-test", async (_req, res) => {
  const region = process.env.BNET_REGION?.toLowerCase() || 'eu';
  const result = await checkCallbackEndpoint(region);
  res.json(result);
});

export default router;
