import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding LIVE Database ---');

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

  // 3. Videos (Reliable standard open video test streams)
  const videosData = [
    {
      title: 'Tears of Steel — High-Fidelity 4K Sci-Fi Stream',
      slug: 'tears-of-steel-4k',
      description: 'A visually breathtaking science fiction cinematic production exploring dystopian futures and robotics, engineered with exceptional color grading and spatial sound.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1280&q=80',
      durationSeconds: 734,
      fileSizeBytes: 148000000,
      resolution: '4K UHD',
      categoryId: categories[0].id,
      uploaderId: creatorUser.id,
      viewCount: 14250,
      likeCount: 980,
    },
    {
      title: 'Cosmos & Sound: Atmospheric Live Experience',
      slug: 'cosmos-and-sound-live',
      description: 'Experience deep celestial visuals synced with analog synth arrangements, captured live in studio with zero post-processing latency.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1280&q=80',
      durationSeconds: 653,
      fileSizeBytes: 112000000,
      resolution: '1080p 60fps',
      categoryId: categories[1].id,
      uploaderId: creatorUser.id,
      viewCount: 8930,
      likeCount: 640,
    },
    {
      title: 'Engineering Low-Latency WebRTC & Media Pipelines',
      slug: 'engineering-low-latency-webrtc',
      description: 'An architectural masterclass on WebRTC signaling, STUN/TURN traversal, congestion control, and building resilient media servers.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1280&q=80',
      durationSeconds: 596,
      fileSizeBytes: 98000000,
      resolution: '1080p',
      categoryId: categories[2].id,
      uploaderId: adminUser.id,
      viewCount: 22100,
      likeCount: 1840,
    },
    {
      title: 'Silent Peaks: An Arctic Wilderness Documentary',
      slug: 'silent-peaks-arctic-documentary',
      description: 'Documenting the stillness and resilience of northern landscapes across extreme seasonal shifts, filmed across remote polar observation posts.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1280&q=80',
      durationSeconds: 480,
      fileSizeBytes: 75000000,
      resolution: '1080p',
      categoryId: categories[3].id,
      uploaderId: creatorUser.id,
      viewCount: 6710,
      likeCount: 512,
    },
    {
      title: 'Urban Geometry: Minimalist Architectural Study',
      slug: 'urban-geometry-minimalist-study',
      description: 'A contemplative visual exploration of brutalist and modernist structures in morning twilight, highlighting light, shadow, and concrete forms.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1280&q=80',
      durationSeconds: 320,
      fileSizeBytes: 42000000,
      resolution: '1080p',
      categoryId: categories[0].id,
      uploaderId: adminUser.id,
      viewCount: 4320,
      likeCount: 390,
    },
    {
      title: 'Real-Time Graphics and Ray Tracing Frontiers',
      slug: 'real-time-graphics-ray-tracing',
      description: 'Demonstrating dynamic lighting calculations and path-traced reflections running in real-time at 120 FPS on modern hardware pipelines.',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1280&q=80',
      durationSeconds: 410,
      fileSizeBytes: 54000000,
      resolution: '1440p',
      categoryId: categories[2].id,
      uploaderId: creatorUser.id,
      viewCount: 11400,
      likeCount: 920,
    },
  ];

  const createdVideos = [];
  for (const v of videosData) {
    const video = await prisma.video.create({ data: v });
    createdVideos.push(video);
  }
  console.log(`✓ Seeded ${createdVideos.length} production videos.`);

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
      progressSeconds: 245,
      watchedPercent: 33.3,
      isCompleted: false,
    },
  });

  await prisma.videoProgress.create({
    data: {
      userId: normalUser.id,
      videoId: createdVideos[1].id,
      progressSeconds: 520,
      watchedPercent: 79.6,
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
