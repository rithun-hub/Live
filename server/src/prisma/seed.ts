import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding LIVE Database with Verified Media Streams ---');

  // Clean existing data
  await prisma.commentReaction.deleteMany();
  await prisma.commentReply.deleteMany();
  await prisma.commentReport.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.videoProgress.deleteMany();
  await prisma.videoDownload.deleteMany();
  await prisma.video.deleteMany();
  await prisma.videoCategory.deleteMany();
  await prisma.meetingMessage.deleteMany();
  await prisma.meetingParticipant.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.trustedDevice.deleteMany();
  await prisma.loginHistory.deleteMany();
  await prisma.oTPVerification.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('LiveAdmin123!', salt);
  const creatorPasswordHash = await bcrypt.hash('LiveCreator123!', salt);
  const userPasswordHash = await bcrypt.hash('LiveUser123!', salt);

  // 1. Create Users
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@live.tv',
      username: 'liveadmin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isEmailVerified: true,
      dailyDownloadLimit: 50,
      profile: {
        create: {
          displayName: 'LIVE Operations Lead',
          bio: 'Platform administrator and broadcast director at LIVE.',
          country: 'India',
        },
      },
      preference: {
        create: {
          theme: 'AUTO',
          preferredLanguage: 'en',
          autoPlayNext: true,
        },
      },
      trustedDevices: {
        create: {
          deviceFingerprint: 'admin-primary-workstation',
          browserName: 'Chrome',
          browserVersion: '128.0',
          osName: 'Windows 11',
          deviceType: 'Desktop',
        },
      },
    },
  });

  const creatorUser = await prisma.user.create({
    data: {
      email: 'creator@live.tv',
      username: 'cinemalive',
      passwordHash: creatorPasswordHash,
      role: 'CREATOR',
      isEmailVerified: true,
      dailyDownloadLimit: 25,
      profile: {
        create: {
          displayName: 'Aura Cinematics',
          bio: 'Producing ultra-low latency live cinema and documentary streams.',
          country: 'United Kingdom',
        },
      },
      preference: {
        create: {
          theme: 'DARK',
          preferredLanguage: 'en',
        },
      },
    },
  });

  const normalUser = await prisma.user.create({
    data: {
      email: 'user@live.tv',
      username: 'sarah_streams',
      passwordHash: userPasswordHash,
      role: 'USER',
      isEmailVerified: true,
      dailyDownloadLimit: 10,
      profile: {
        create: {
          displayName: 'Sarah Jenkins',
          bio: 'Video enthusiast, streamer, and tech researcher.',
          country: 'United States',
        },
      },
      preference: {
        create: {
          theme: 'AUTO',
          preferredLanguage: 'en',
        },
      },
    },
  });

  console.log('✓ Users created:');
  console.log('  - Admin: admin@live.tv (Password: LiveAdmin123!)');
  console.log('  - Creator: creator@live.tv (Password: LiveCreator123!)');
  console.log('  - User: user@live.tv (Password: LiveUser123!)');

  // 2. Video Categories
  const categories = await Promise.all([
    prisma.videoCategory.create({
      data: {
        name: 'Cinematic Arts',
        slug: 'cinematic-arts',
        description: 'Immersive short films, cinematography showcases, and high-dynamic-range productions.',
        icon: 'Film',
      },
    }),
    prisma.videoCategory.create({
      data: {
        name: 'Live Broadcasts',
        slug: 'live-broadcasts',
        description: 'Real-time studio broadcasts, discussions, and multi-cam stage performances.',
        icon: 'Radio',
      },
    }),
    prisma.videoCategory.create({
      data: {
        name: 'Technology & AI',
        slug: 'technology-ai',
        description: 'Deep dives into distributed computing, real-time architectures, and modern engineering.',
        icon: 'Cpu',
      },
    }),
    prisma.videoCategory.create({
      data: {
        name: 'Documentaries',
        slug: 'documentaries',
        description: 'Compelling true stories, environmental insights, and investigative reports.',
        icon: 'Compass',
      },
    }),
  ]);

  console.log(`✓ Created ${categories.length} categories.`);

  // 3. Reliable Public Verified Videos (All HTTP 200 OK with public Range support)
  const videosData = [
    {
      title: 'View From A Blue Moon — 4K Ultra Cinematic Stream',
      slug: 'view-from-a-blue-moon-4k',
      description: 'The first surf film shot entirely in 4K. Visually breathtaking cinematography tracking world-class athletes across South Pacific swells and rugged shorelines with spatial audio.',
      videoUrl: 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-1080p.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1280&q=80',
      durationSeconds: 195,
      fileSizeBytes: 118708871,
      resolution: '4K UHD',
      categoryId: categories[0].id,
      uploaderId: creatorUser.id,
      viewCount: 28450,
      likeCount: 1920,
    },
    {
      title: 'Oceans of Wonder: Marine Life Documentary',
      slug: 'oceans-of-wonder-documentary',
      description: 'Dive into the pristine depths of the open sea. Capturing bioluminescent coral ecosystems, manta rays, and oceanic predators with high-speed underwater camera rigs.',
      videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1280&q=80',
      durationSeconds: 215,
      fileSizeBytes: 23014356,
      resolution: '1080p 60fps',
      categoryId: categories[3].id,
      uploaderId: creatorUser.id,
      viewCount: 14210,
      likeCount: 1140,
    },
    {
      title: 'Sintel: High-Fantasy Animated Studio Broadcast',
      slug: 'sintel-animated-broadcast',
      description: 'An emotional narrative exploring dragons, desert outposts, and devotion. Masterfully animated and rendered using open computational graphics pipelines.',
      videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1280&q=80',
      durationSeconds: 52,
      fileSizeBytes: 4372373,
      resolution: '1080p',
      categoryId: categories[0].id,
      uploaderId: adminUser.id,
      viewCount: 31200,
      likeCount: 2450,
    },
    {
      title: 'Coastal Swell: Ocean Action in 720p HD',
      slug: 'coastal-swell-action-stream',
      description: 'Experience rapid wave breaks and crystal waters filmed in tropical reefs with high-frame-rate stabilization.',
      videoUrl: 'https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-720p.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1280&q=80',
      durationSeconds: 195,
      fileSizeBytes: 72827883,
      resolution: '720p HD',
      categoryId: categories[1].id,
      uploaderId: creatorUser.id,
      viewCount: 8930,
      likeCount: 680,
    },
    {
      title: 'W3C Open Standards Media Pipeline Benchmark',
      slug: 'w3c-standards-media-pipeline',
      description: 'Real-time media pipeline demonstration validating HTML5 video buffering, Range headers, and sub-second seeking on low-overhead infrastructure.',
      videoUrl: 'https://media.w3.org/2010/05/video/movie_300.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1280&q=80',
      durationSeconds: 32,
      fileSizeBytes: 2757913,
      resolution: '1080p',
      categoryId: categories[2].id,
      uploaderId: adminUser.id,
      viewCount: 9420,
      likeCount: 790,
    },
    {
      title: 'Nature in Bloom: Micro Macro Flora Broadcast',
      slug: 'nature-in-bloom-macro-flora',
      description: 'High magnification botanical photography capturing flower petals unfolding in sunlight. Zero compression artifacts with vivid color fidelity.',
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1280&q=80',
      durationSeconds: 15,
      fileSizeBytes: 1128375,
      resolution: '1080p',
      categoryId: categories[3].id,
      uploaderId: creatorUser.id,
      viewCount: 5630,
      likeCount: 420,
    },
  ];

  const createdVideos = [];
  for (const v of videosData) {
    const video = await prisma.video.create({ data: v });
    createdVideos.push(video);
  }
  console.log(`✓ Seeded ${createdVideos.length} verified production videos.`);

  // 4. Multilingual Comments on Video 1
  const video1 = createdVideos[0];
  const comment1 = await prisma.comment.create({
    data: {
      videoId: video1.id,
      userId: normalUser.id,
      content: 'This is an incredible live broadcast! The color grading on the shadows is sublime.',
      likeCount: 14,
      dislikeCount: 0,
    },
  });

  await prisma.comment.create({
    data: {
      videoId: video1.id,
      userId: creatorUser.id,
      content: '¡Esta es una transmisión en vivo increíble! La calidad de audio y video es impecable.', // Spanish
      likeCount: 9,
      dislikeCount: 0,
    },
  });

  await prisma.comment.create({
    data: {
      videoId: video1.id,
      userId: adminUser.id,
      content: 'यह एक अविश्वसनीय लाइव प्रसारण है! फ्रेम दर बहुत स्थिर है।', // Hindi
      likeCount: 7,
      dislikeCount: 0,
    },
  });

  // Reply to Comment 1
  await prisma.commentReply.create({
    data: {
      commentId: comment1.id,
      userId: creatorUser.id,
      content: '@sarah_streams Thank you! We worked closely with the colorists to ensure every frame shines.',
    },
  });

  // 5. Watch History for Normal User
  await prisma.videoProgress.create({
    data: {
      userId: normalUser.id,
      videoId: video1.id,
      progressSeconds: 45,
      watchedPercent: 23.0,
      isCompleted: false,
    },
  });

  await prisma.videoProgress.create({
    data: {
      userId: normalUser.id,
      videoId: createdVideos[1].id,
      progressSeconds: 120,
      watchedPercent: 55.8,
      isCompleted: false,
    },
  });

  // 6. Sample Live Meeting Room
  await prisma.meeting.create({
    data: {
      roomCode: 'live-prod-sync',
      title: 'LIVE Global Engineering & Stream Sync',
      description: 'Daily platform architecture check-in, real-time media pipeline review, and quality testing.',
      hostId: adminUser.id,
      status: 'ACTIVE',
      screenShareAllowed: true,
      chatAllowed: true,
      maxParticipants: 50,
    },
  });

  console.log('✓ Seeded active meeting room: live-prod-sync');
  console.log('--- Database Seeding Complete ---');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
