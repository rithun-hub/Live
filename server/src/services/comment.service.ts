import { prisma } from '../config/prisma';

// Moderation dictionary & heuristics
const PROFANITY_LIST = [
  'scam',
  'free-money',
  'buy-crypto',
  'hack',
  'cheat',
  'spammer',
  'phishing',
  'malware',
];

const MALICIOUS_LINK_REGEX = /https?:\/\/(?:bit\.ly|tinyurl\.com|goo\.gl|t\.co|shorturl\.at|fake[a-z0-9.-]+)/i;

// Translation Service Abstraction
export interface ITranslationProvider {
  translate(text: string, targetLanguage: string): Promise<{ translatedText: string; detectedSourceLanguage: string }>;
}

export class MockOrExternalTranslationProvider implements ITranslationProvider {
  // Built-in intelligent multilingual phrases dictionary for high-frequency comments
  private commonTranslations: Record<string, Record<string, string>> = {
    'this is an incredible live broadcast!': {
      es: '¡Esta es una transmisión en vivo increíble!',
      fr: 'Ceci est une diffusion en direct incroyable !',
      hi: 'यह एक अविश्वसनीय लाइव प्रसारण है!',
      de: 'Das ist eine unglaubliche Live-Übertragung!',
      ja: '信じられないほど素晴らしいライブ配信です！',
    },
    'great video quality and low latency.': {
      es: 'Excelente calidad de video y baja latencia.',
      fr: 'Excellente qualité vidéo et faible latence.',
      hi: 'उत्कृष्ट वीडियो गुणवत्ता और कम विलंबता।',
      de: 'Tolle Videoqualität und geringe Latenz.',
      ja: '素晴らしい画質と低遅延です。',
    },
    'loving the custom player controls!': {
      es: '¡Me encantan los controles personalizados del reproductor!',
      fr: 'J\'adore les contrôles personnalisés du lecteur !',
      hi: 'कस्टम प्लेयर नियंत्रण बहुत पसंद आ रहे हैं!',
      de: 'Ich liebe die benutzerdefinierten Player-Steuerelemente!',
      ja: 'カスタムプレーヤーの操作性が最高です！',
    },
    'everything happens live on this platform.': {
      es: 'Todo sucede en vivo en esta plataforma.',
      fr: 'Tout se passe en direct sur cette plateforme.',
      hi: 'इस प्लेटफॉर्म पर सब कुछ लाइव होता है।',
      de: 'Auf dieser Plattform passiert alles live.',
      ja: 'このプラットフォームではすべてがライブで起きています。',
    },
  };

  async translate(text: string, targetLanguage: string): Promise<{ translatedText: string; detectedSourceLanguage: string }> {
    const clean = text.trim().toLowerCase();
    
    // Check dictionary
    if (this.commonTranslations[clean] && this.commonTranslations[clean][targetLanguage]) {
      return {
        translatedText: this.commonTranslations[clean][targetLanguage],
        detectedSourceLanguage: 'en',
      };
    }

    // Language prefix indicators for realistic multilingual demonstration
    const langNames: Record<string, string> = {
      es: 'Spanish',
      fr: 'French',
      hi: 'Hindi',
      de: 'German',
      ja: 'Japanese',
      zh: 'Chinese',
      ar: 'Arabic',
      ru: 'Russian',
      en: 'English',
    };

    const targetName = langNames[targetLanguage] || targetLanguage.toUpperCase();
    
    // Graceful translation representation without fabricating gibberish
    return {
      translatedText: `[${targetName} translation]: ${text}`,
      detectedSourceLanguage: 'auto',
    };
  }
}

export const translationProvider: ITranslationProvider = new MockOrExternalTranslationProvider();

export class CommentService {
  async listVideoComments(
    videoId: string,
    params: {
      sortBy?: 'newest' | 'oldest' | 'liked' | 'relevance';
      userId?: string;
    }
  ) {
    let orderBy: any = { createdAt: 'desc' };
    if (params.sortBy === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else if (params.sortBy === 'liked') {
      orderBy = { likeCount: 'desc' };
    }

    const comments = await prisma.comment.findMany({
      where: { videoId },
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            profile: {
              select: { displayName: true, avatarUrl: true },
            },
          },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                role: true,
                profile: {
                  select: { displayName: true, avatarUrl: true },
                },
              },
            },
          },
        },
        reactions: params.userId
          ? {
              where: { userId: params.userId },
              select: { type: true },
            }
          : false,
        _count: {
          select: { replies: true, reports: true },
        },
      },
    });

    return comments.map((c) => ({
      ...c,
      currentUserReaction: c.reactions && c.reactions.length > 0 ? c.reactions[0].type : null,
      reactions: undefined,
    }));
  }

  async postComment(userId: string, videoId: string, content: string, parentCommentId?: string) {
    // 1. Spam & Profanity validation
    const lowerContent = content.toLowerCase();
    for (const banned of PROFANITY_LIST) {
      if (lowerContent.includes(banned)) {
        throw new Error('Comment contains prohibited words or suspected spam.');
      }
    }

    // 2. Malicious link check
    if (MALICIOUS_LINK_REGEX.test(content)) {
      throw new Error('Comments containing suspicious or shortened links are not permitted.');
    }

    // 3. Duplicate comment detection
    const recentDuplicate = await prisma.comment.findFirst({
      where: {
        userId,
        content: content.trim(),
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // within 5 minutes
      },
    });

    if (recentDuplicate) {
      throw new Error('Duplicate comment detected. Please avoid posting the exact same comment repeatedly.');
    }

    // Check if it's a reply to an existing comment
    if (parentCommentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentCommentId },
        include: { user: true },
      });

      if (!parent) {
        throw new Error('Parent comment not found.');
      }

      const reply = await prisma.commentReply.create({
        data: {
          commentId: parentCommentId,
          userId,
          content: content.trim(),
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profile: { select: { displayName: true, avatarUrl: true } },
            },
          },
        },
      });

      // Notification to parent author if different user
      if (parent.userId !== userId) {
        await prisma.notification.create({
          data: {
            userId: parent.userId,
            title: 'New Reply to Your Comment',
            message: `@${reply.user.username} replied: "${content.slice(0, 60)}..."`,
            type: 'COMMENT_REPLY',
            linkUrl: `/watch/${videoId}`,
          },
        });
      }

      return reply;
    }

    // Top level comment
    return prisma.comment.create({
      data: {
        videoId,
        userId,
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
        replies: true,
      },
    });
  }

  async editComment(userId: string, commentId: string, newContent: string) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      throw new Error('Comment not found.');
    }

    if (comment.userId !== userId) {
      throw new Error('You are only authorized to edit your own comments.');
    }

    return prisma.comment.update({
      where: { id: commentId },
      data: {
        content: newContent.trim(),
        isEdited: true,
      },
    });
  }

  async deleteComment(userId: string, userRole: string, commentId: string) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      throw new Error('Comment not found.');
    }

    if (comment.userId !== userId && userRole !== 'ADMIN') {
      throw new Error('Unauthorized to delete this comment.');
    }

    await prisma.comment.delete({ where: { id: commentId } });
    return { success: true, message: 'Comment deleted successfully.' };
  }

  async reactToComment(userId: string, commentId: string, reactionType: 'LIKE' | 'DISLIKE') {
    const existing = await prisma.commentReaction.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
    });

    if (existing) {
      if (existing.type === reactionType) {
        // Toggle off reaction
        await prisma.commentReaction.delete({ where: { id: existing.id } });
        await prisma.comment.update({
          where: { id: commentId },
          data: {
            [reactionType === 'LIKE' ? 'likeCount' : 'dislikeCount']: { decrement: 1 },
          },
        });
        return { currentReaction: null };
      } else {
        // Switch reaction
        await prisma.commentReaction.update({
          where: { id: existing.id },
          data: { type: reactionType },
        });
        await prisma.comment.update({
          where: { id: commentId },
          data: {
            likeCount: reactionType === 'LIKE' ? { increment: 1 } : { decrement: 1 },
            dislikeCount: reactionType === 'DISLIKE' ? { increment: 1 } : { decrement: 1 },
          },
        });
        return { currentReaction: reactionType };
      }
    } else {
      // New reaction
      await prisma.commentReaction.create({
        data: {
          commentId,
          userId,
          type: reactionType,
        },
      });
      await prisma.comment.update({
        where: { id: commentId },
        data: {
          [reactionType === 'LIKE' ? 'likeCount' : 'dislikeCount']: { increment: 1 },
        },
      });
      return { currentReaction: reactionType };
    }
  }

  async reportComment(
    userId: string,
    commentId: string,
    reason: string,
    details?: string
  ) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      throw new Error('Comment not found.');
    }

    const existingReport = await prisma.commentReport.findFirst({
      where: {
        commentId,
        reporterId: userId,
      },
    });

    if (existingReport) {
      throw new Error('You have already submitted a report for this comment.');
    }

    return prisma.commentReport.create({
      data: {
        commentId,
        reporterId: userId,
        reason,
        details,
      },
    });
  }

  async translateComment(commentId: string, targetLanguage: string) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      throw new Error('Comment not found.');
    }

    const result = await translationProvider.translate(comment.content, targetLanguage);
    return {
      commentId,
      originalText: comment.content,
      translatedText: result.translatedText,
      targetLanguage,
      detectedSourceLanguage: result.detectedSourceLanguage,
    };
  }
}

export const commentService = new CommentService();
