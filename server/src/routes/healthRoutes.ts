import express from "express";
import axios from "axios";

const router = express.Router();

interface HealthCheckResult {
  status: "up" | "down";
  service: string;
  latency: number;
  timestamp: string;
  error?: string;
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
  const region = process.env.BNET_REGION?.toLowerCase() || 'eu';
  const result = await checkBattleNetTokenEndpoint(region);
  res.json(result);
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
  try {
    const callbackUrl = process.env.BNET_CALLBACK_URL;
    const region = process.env.BNET_REGION?.toLowerCase() || 'eu';

    // Test 1: URL Format Check
    let urlFormatValid = false;
    try {
      new URL(callbackUrl!);
      urlFormatValid = true;
    } catch (e) {
      urlFormatValid = false;
    }

    // Test 2: Registration Check
    const registrationCheck = await axios.get(
      `https://${region}.battle.net/oauth/authorize`,
      {
        params: {
          response_type: 'code',
          client_id: process.env.BNET_CLIENT_ID,
          redirect_uri: callbackUrl,
          scope: 'wow.profile',
          state: 'test'
        },
        maxRedirects: 0,  // Don't follow redirects
        validateStatus: (_status) => true  // Accept any status code
      }
    ).catch(error => ({
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers
    }));

    // Test 3: Callback Endpoint Availability
    const endpointCheck = await axios.get(callbackUrl!, {
      params: {
        test: true  // Add this to identify test requests
      },
      validateStatus: (_status) => true // Accept any status code
    }).catch(error => ({
      status: error.code === 'ECONNREFUSED' ? 'Connection Refused' : error.response?.status,
      error: error.message
    }));

    res.json({
      timestamp: new Date().toISOString(),
      callbackUrl,
      tests: {
        urlFormat: {
          status: urlFormatValid ? 'pass' : 'fail',
          details: urlFormatValid ? 'Valid URL format' : 'Invalid URL format'
        },
        registration: {
          status: registrationCheck.status === 302 ? 'pass' : 'fail',
          statusCode: registrationCheck.status,
          details: registrationCheck.status === 302 
            ? 'Redirect as expected' 
            : `Unexpected response: ${JSON.stringify({
                status: registrationCheck.status,
                location: registrationCheck.headers?.location,
                contentType: registrationCheck.headers?.['content-type']
              })}`,
          redirectUrl: registrationCheck.headers?.location
        },
        endpoint: {
          status: [400, 401, 403].includes(endpointCheck.status) ? 'pass' : 'warning',  // These are acceptable status codes for OAuth endpoints
          statusCode: endpointCheck.status,
          details: [400, 401, 403].includes(endpointCheck.status)
            ? 'Endpoint properly rejecting unauthorized requests'
            : `Unexpected response: ${endpointCheck.status}`
        }
      },
      recommendations: []
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
