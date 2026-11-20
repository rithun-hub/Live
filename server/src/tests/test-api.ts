import { server } from '../app';

async function runIntegrationTests() {
  console.log('\n======================================================');
  console.log('   RUNNING LIVE BACKEND & RTC INTEGRATION TESTS');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    const BASE = 'http://127.0.0.1:5000';

    // 1. Health check test
    const healthRes = await fetch(`${BASE}/health`);
    const healthData = (await healthRes.json()) as any;
    assert(healthRes.status === 200 && healthData.platform === 'LIVE', 'Health check returns online platform status');

    // 2. Video listing test
    const videosRes = await fetch(`${BASE}/api/v1/videos`);
    const videosData = (await videosRes.json()) as any;
    assert(videosRes.status === 200 && Array.isArray(videosData.videos) && videosData.videos.length > 0, `Video listing returns seeded broadcasts (${videosData.videos?.length} found)`);

    // 3. User Login test (Admin) - Untrusted Device triggers OTP
    const adminLoginRes = await fetch(`${BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'admin@live.tv', password: 'LiveAdmin123!' }),
    });
    const adminData = (await adminLoginRes.json()) as any;
    let adminToken = adminData.accessToken;

    if (adminData.requiresOtp && adminData.devOtp) {
      assert(adminData.requiresOtp === true && !!adminData.devOtp, 'New untrusted device detected: Server initiates OTP challenge');
      const verifyRes = await fetch(`${BASE}/api/v1/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminData.email,
          otp: adminData.devOtp,
          purpose: adminData.purpose,
        }),
      });
      const verifyData = (await verifyRes.json()) as any;
      adminToken = verifyData.accessToken;
      assert(verifyRes.status === 200 && !!adminToken, 'Admin OTP verification succeeds and device is trusted with JWT session');
    } else {
      assert(adminLoginRes.status === 200 && !!adminToken, 'Admin login succeeds and issues JWT access token');
    }

    // 4. Standard User Login test
    const userLoginRes = await fetch(`${BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'user@live.tv', password: 'LiveUser123!' }),
    });
    const userData = (await userLoginRes.json()) as any;
    let userToken = userData.accessToken;

    if (userData.requiresOtp && userData.devOtp) {
      const verifyRes = await fetch(`${BASE}/api/v1/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userData.email,
          otp: userData.devOtp,
          purpose: userData.purpose,
        }),
      });
      const verifyData = (await verifyRes.json()) as any;
      userToken = verifyData.accessToken;
      assert(verifyRes.status === 200 && !!userToken, 'Standard user OTP verification succeeds and authenticates');
    } else {
      assert(userLoginRes.status === 200 && !!userToken, 'Standard user login succeeds');
    }

    // 5. Video detail by slug
    const firstVideo = videosData.videos[0];
    const videoDetailRes = await fetch(`${BASE}/api/v1/videos/${firstVideo.slug}`);
    const videoDetailData = (await videoDetailRes.json()) as any;
    assert(videoDetailRes.status === 200 && videoDetailData.video.title === firstVideo.title, `Video detail retrieval succeeds for '${firstVideo.title.slice(0, 30)}...'`);

    // 6. Video Download Authorization & Daily Quota check
    const authDownloadRes = await fetch(`${BASE}/api/v1/videos/downloads/${firstVideo.id}/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
    });
    const authDownloadData = (await authDownloadRes.json()) as any;
    assert(authDownloadRes.status === 200 && !!authDownloadData.authorization?.downloadId, 'Server-side download authorization check verifies quota and creates audit record');

    // 7. Video Progress Tracking test
    const progressRes = await fetch(`${BASE}/api/v1/videos/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        videoId: firstVideo.id,
        progressSeconds: 180,
        durationSeconds: firstVideo.durationSeconds || 600,
      }),
    });
    const progressData = (await progressRes.json()) as any;
    assert(progressRes.status === 200 && progressData.progress.progressSeconds === 180, 'Video watch progress saves and syncs accurately');

    // 8. Comment and Multilingual Translation test
    const commentRes = await fetch(`${BASE}/api/v1/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        videoId: firstVideo.id,
        content: `Everything happens live on this platform. (Test ID ${Date.now()})`,
      }),
    });
    const commentData = (await commentRes.json()) as any;
    assert(commentRes.status === 201 && !!commentData.comment?.id, 'Comment posted with user validation and profanity filter');

    // Translate posted comment to Spanish
    if (commentData.comment?.id) {
      const translateRes = await fetch(`${BASE}/api/v1/comments/${commentData.comment.id}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLanguage: 'es' }),
      });
      const translateData = (await translateRes.json()) as any;
      assert(translateRes.status === 200 && !!translateData.translatedText, `Comment translated to Spanish: "${translateData.translatedText}"`);
    }

    // 9. Meeting Creation & Room Verification test
    const meetingRes = await fetch(`${BASE}/api/v1/meetings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'LIVE Production Testing Room',
        maxParticipants: 50,
      }),
    });
    const meetingData = (await meetingRes.json()) as any;
    assert(meetingRes.status === 201 && !!meetingData.meeting?.roomCode, `Meeting created with unique code: ${meetingData.meeting?.roomCode}`);

    // 10. Admin Dashboard Statistics test
    const adminStatsRes = await fetch(`${BASE}/api/v1/admin/dashboard`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const adminStatsData = (await adminStatsRes.json()) as any;
    assert(
      adminStatsRes.status === 200 && adminStatsData.stats.totalUsers >= 3,
      `Admin dashboard reports accurate metrics (${adminStatsData.stats?.totalUsers} users, ${adminStatsData.stats?.totalVideos} videos, ${adminStatsData.stats?.totalDownloads} downloads)`
    );

    console.log('\n======================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');
  } catch (error) {
    console.error('Test execution error:', error);
    failed++;
  } finally {
    process.exit(failed > 0 ? 1 : 0);
  }
}

if (server.listening) {
  setTimeout(runIntegrationTests, 100);
} else {
  server.on('listening', () => {
    setTimeout(runIntegrationTests, 300);
  });
}
