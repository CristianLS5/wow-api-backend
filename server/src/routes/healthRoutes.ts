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
        }
      }
    ).catch(error => ({
      status: error.response?.status,
      data: error.response?.data
    }));

    // Test 3: Callback Endpoint Availability
    const endpointCheck = await axios.get(callbackUrl!, {
      validateStatus: (_status) => true // Accept any status code
    }).catch(error => ({
      status: error.code === 'ECONNREFUSED' ? 'Connection Refused' : error.response?.status
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
            : 'Unexpected response'
        },
        endpoint: {
          status: endpointCheck.status === 200 ? 'pass' : 'warning',
          statusCode: endpointCheck.status,
          details: typeof endpointCheck.status === 'number' 
            ? 'Endpoint reachable' 
            : 'Endpoint not reachable'
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
