import { z } from 'zod';
import { Vote } from '@prisma/client';

import { EXPERIENCES, LOCATIONS, ROLES } from '~/utils/resumes/resumeFilters';

import { createRouter } from '../context';

import type { Resume } from '~/types/resume';

export const resumesRouter = createRouter()
  .query('findAll', {
    input: z.object({
      experienceFilters: z.string().array(),
      locationFilters: z.string().array(),
      numComments: z.number().optional(),
      roleFilters: z.string().array(),
      searchValue: z.string(),
      skip: z.number(),
      sortOrder: z.string(),
      take: z.number(),
    }),
    async resolve({ ctx, input }) {
      const {
        roleFilters,
        locationFilters,
        experienceFilters,
        sortOrder,
        numComments,
        skip,
        searchValue,
        take,
      } = input;
      const userId = ctx.session?.user?.id;
      const totalRecords = await ctx.prisma.resumesResume.count({
        where: {
          ...(numComments === 0 && {
            comments: {
              none: {},
            },
          }),
          experience: { in: experienceFilters },
          location: { in: locationFilters },
          role: { in: roleFilters },
          title: { contains: searchValue, mode: 'insensitive' },
        },
      });
      const resumesData = await ctx.prisma.resumesResume.findMany({
        include: {
          _count: {
            select: {
              comments: true,
              stars: true,
            },
          },
          comments: true,
          stars: {
            where: {
              OR: {
                userId,
              },
            },
          },
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy:
          sortOrder === 'latest'
            ? {
                createdAt: 'desc',
              }
            : sortOrder === 'popular'
            ? {
                stars: {
                  _count: 'desc',
                },
              }
            : { comments: { _count: 'desc' } },
        skip,
        take,
        where: {
          ...(numComments === 0 && {
            comments: {
              none: {},
            },
          }),
          experience: { in: experienceFilters },
          location: { in: locationFilters },
          role: { in: roleFilters },
          title: { contains: searchValue, mode: 'insensitive' },
        },
      });
      const mappedResumeData = resumesData.map((r) => {
        const resume: Resume = {
          additionalInfo: r.additionalInfo,
          createdAt: r.createdAt,
          experience: r.experience,
          id: r.id,
          isResolved: r.isResolved,
          isStarredByUser: r.stars.length > 0,
          location: r.location,
          numComments: r._count.comments,
          numStars: r._count.stars,
          role: r.role,
          title: r.title,
          url: r.url,
          user: r.user.name!,
        };
        return resume;
      });
      return { mappedResumeData, totalRecords };
    },
  })
  .query('findOne', {
    input: z.object({
      resumeId: z.string(),
    }),
    async resolve({ ctx, input }) {
      const { resumeId } = input;
      const userId = ctx.session?.user?.id;

      // Use the resumeId to query all related information of a single resume
      // from Resumesresume:
      return await ctx.prisma.resumesResume.findUnique({
        include: {
          _count: {
            select: {
              stars: true,
            },
          },
          stars: {
            where: {
              OR: {
                userId,
              },
            },
          },
          user: {
            select: {
              name: true,
            },
          },
        },
        where: {
          id: resumeId,
        },
      });
    },
  })
  .query('findUserReviewedResumeCount', {
    input: z.object({
      userId: z.string(),
    }),
    async resolve({ ctx, input }) {
      return await ctx.prisma.resumesResume.count({
        where: {
          // User has commented on this resume
          comments: {
            some: {
              userId: input.userId,
            },
          },
          // Not user's own resume
          userId: {
            not: input.userId,
          },
        },
      });
    },
  })
  .query('findUserMaxResumeUpvoteCount', {
    input: z.object({
      userId: z.string(),
    }),
    async resolve({ ctx, input }) {
      const highestUpvotedResume = await ctx.prisma.resumesResume.findFirst({
        orderBy: {
          stars: {
            _count: 'desc',
          },
        },
        select: {
          _count: {
            select: {
              stars: true,
            },
          },
        },
        where: {
          userId: input.userId,
        },
      });

      return highestUpvotedResume?._count?.stars ?? 0;
    },
  })
  .query('findUserTopUpvotedCommentCount', {
    input: z.object({
      userId: z.string(),
    }),
    async resolve({ ctx, input }) {
      const resumes = await ctx.prisma.resumesResume.findMany({
        select: {
          comments: {
            select: {
              userId: true,
              votes: {
                select: {
                  value: true,
                },
              },
            },
          },
        },
      });

      let topUpvotedCommentCount = 0;

      for (const resume of resumes) {
        // Set minimum upvote count >= 5 to qualify
        let highestVoteCount = 5;

        // Get Map of {userId, voteCount} for each comment
        const commentUpvotePairs = [];
        for (const comment of resume.comments) {
          const { userId, votes } = comment;
          let voteCount = 0;
          for (const vote of votes) {
            if (vote.value === Vote.UPVOTE) {
              voteCount++;
            } else {
              voteCount--;
            }
          }
          if (voteCount >= highestVoteCount) {
            highestVoteCount = voteCount;
            commentUpvotePairs.push({ userId, voteCount });
          }
        }

        // Filter to get the userIds with the highest vote counts
        const userIds = commentUpvotePairs
          .filter((pair) => pair.voteCount === highestVoteCount)
          .map((pair) => pair.userId);

        // Increment if input userId is the highest voted comment
        if (userIds.includes(input.userId)) {
          topUpvotedCommentCount++;
        }
      }

      return topUpvotedCommentCount;
    },
  })
  .query('getTotalFilterCounts', {
    async resolve({ ctx }) {
      const roleCounts = await ctx.prisma.resumesResume.groupBy({
        _count: {
          _all: true,
        },
        by: ['role'],
      });
      const mappedRoleCounts = Object.fromEntries(
        roleCounts.map((rc) => [rc.role, rc._count._all]),
      );
      const zeroRoleCounts = Object.fromEntries(
        ROLES.filter((r) => !(r.value in mappedRoleCounts)).map((r) => [
          r.value,
          0,
        ]),
      );
      const processedRoleCounts = {
        ...mappedRoleCounts,
        ...zeroRoleCounts,
      };

      const experienceCounts = await ctx.prisma.resumesResume.groupBy({
        _count: {
          _all: true,
        },
        by: ['experience'],
      });
      const mappedExperienceCounts = Object.fromEntries(
        experienceCounts.map((ec) => [ec.experience, ec._count._all]),
      );
      const zeroExperienceCounts = Object.fromEntries(
        EXPERIENCES.filter((e) => !(e.value in mappedExperienceCounts)).map(
          (e) => [e.value, 0],
        ),
      );
      const processedExperienceCounts = {
        ...mappedExperienceCounts,
        ...zeroExperienceCounts,
      };

      const locationCounts = await ctx.prisma.resumesResume.groupBy({
        _count: {
          _all: true,
        },
        by: ['location'],
      });
      const mappedLocationCounts = Object.fromEntries(
        locationCounts.map((lc) => [lc.location, lc._count._all]),
      );
      const zeroLocationCounts = Object.fromEntries(
        LOCATIONS.filter((l) => !(l.value in mappedLocationCounts)).map((l) => [
          l.value,
          0,
        ]),
      );
      const processedLocationCounts = {
        ...mappedLocationCounts,
        ...zeroLocationCounts,
      };

      return {
        Experience: processedExperienceCounts,
        Location: processedLocationCounts,
        Role: processedRoleCounts,
      };
    },
  });
