import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { env } from '~/env';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { db } from '~/server/db';
import { sendFeedbackEmail, sendInviteEmail } from '~/server/mailer';
import { SplitwiseGroupSchema, SplitwiseUserSchema } from '~/types';

import {
  deleteExpense,
  getCompleteFriendsDetails,
  getCompleteGroupDetails,
  importGroupFromSplitwise,
  importUserBalanceFromSplitWise,
} from '../services/splitService';

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(({ ctx }) => {
    return ctx.session.user;
  }),

  getFriends: protectedProcedure.query(async ({ ctx }) => {
    const balanceWithFriends = await db.balance.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      select: {
        friendId: true,
      },
      distinct: ['friendId'],
    });

    const friendsIds = balanceWithFriends.map((f) => f.friendId);

    const friends = await db.user.findMany({
      where: {
        id: {
          in: friendsIds,
        },
      },
    });

    return friends;
  }),

  inviteFriend: protectedProcedure
    .input(z.object({ email: z.string(), sendInviteEmail: z.boolean().optional() }))
    .mutation(async ({ input, ctx: { session } }) => {
      const friend = await db.user.findUnique({
        where: {
          email: input.email,
        },
      });

      if (friend) {
        return friend;
      }

      const user = await db.user.create({
        data: {
          email: input.email,
          name: input.email.split('@')[0],
        },
      });

      if (input.sendInviteEmail) {
        sendInviteEmail(input.email, session.user.name ?? session.user.email ?? '').catch((err) => {
          console.error('Error sending invite email', err);
        });
      }

      return user;
    }),

  getBalancesWithFriend: protectedProcedure
    .input(z.object({ friendId: z.number() }))
    .query(async ({ input, ctx }) => {
      const balances = db.balance.findMany({
        where: {
          userId: ctx.session.user.id,
          friendId: input.friendId,
          amount: {
            not: 0,
          },
        },
      });

      return balances;
    }),

  getExpenseDetails: protectedProcedure
    .input(z.object({ expenseId: z.string() }))
    .query(async ({ input }) => {
      const expense = await db.expense.findUnique({
        where: {
          id: input.expenseId,
        },
        include: {
          expenseParticipants: {
            include: {
              user: true,
            },
          },
          expenseNotes: true,
          addedByUser: true,
          paidByUser: true,
          deletedByUser: true,
          updatedByUser: true,
          group: true,
        },
      });

      if (expense?.groupId) {
        const missingGroupMembers = await db.group.findUnique({
          where: {
            id: expense.groupId,
          },
          include: {
            groupUsers: {
              include: {
                user: true,
              },
              where: {
                userId: {
                  notIn: expense.expenseParticipants.map((ep) => ep.userId),
                },
              },
            },
          },
        });
        missingGroupMembers?.groupUsers.forEach((gu) => {
          expense.expenseParticipants.push({
            userId: gu.user.id,
            expenseId: expense.id,
            user: gu.user,
            amount: 0n,
          });
        });
      }

      return expense;
    }),

  updateUserDetail: protectedProcedure
    .input(z.object({ name: z.string().optional(), currency: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const user = await db.user.update({
        where: {
          id: ctx.session.user.id,
        },
        data: {
          ...input,
        },
      });

      return user;
    }),

  getAllExpenses: protectedProcedure.query(async ({ ctx }) => {
    const expenses = await db.expenseParticipant.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      orderBy: {
        expense: {
          createdAt: 'desc',
        },
      },
      include: {
        expense: {
          include: {
            paidByUser: {
              select: {
                name: true,
                email: true,
                image: true,
                id: true,
              },
            },
            deletedByUser: {
              select: {
                name: true,
                email: true,
                image: true,
                id: true,
              },
            },
          },
        },
      },
    });

    return expenses;
  }),

  getUserDetails: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const user = await db.user.findUnique({
        where: {
          id: input.userId,
        },
      });

      return user;
    }),

  deleteExpense: protectedProcedure
    .input(z.object({ expenseId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const expenseParticipant = await db.expenseParticipant.findUnique({
        where: {
          expenseId_userId: {
            expenseId: input.expenseId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!expenseParticipant) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not the participant of the expense',
        });
      }

      await deleteExpense(input.expenseId, ctx.session.user.id);
    }),

  submitFeedback: protectedProcedure
    .input(z.object({ feedback: z.string().min(10) }))
    .mutation(async ({ input, ctx }) => {
      await sendFeedbackEmail(input.feedback, ctx.session.user);
    }),

  getFriend: protectedProcedure
    .input(z.object({ friendId: z.number() }))
    .query(async ({ input, ctx }) => {
      const friend = await db.user.findUnique({
        where: {
          id: input.friendId,
          userBalances: {
            some: {
              friendId: ctx.session.user.id,
            },
          },
        },
      });

      return friend;
    }),

  updatePushNotification: protectedProcedure
    .input(z.object({ subscription: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await db.pushNotification.upsert({
        where: {
          userId: ctx.session.user.id,
        },
        create: {
          userId: ctx.session.user.id,
          subscription: input.subscription,
        },
        update: {
          subscription: input.subscription,
        },
      });
    }),

  deleteFriend: protectedProcedure
    .input(z.object({ friendId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const friendBalances = await db.balance.findMany({
        where: {
          userId: ctx.session.user.id,
          friendId: input.friendId,
          amount: {
            not: 0,
          },
        },
      });

      if (0 < friendBalances.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You have outstanding balances with this friend',
        });
      }

      await db.balance.deleteMany({
        where: {
          userId: input.friendId,
          friendId: ctx.session.user.id,
        },
      });

      await db.balance.deleteMany({
        where: {
          friendId: input.friendId,
          userId: ctx.session.user.id,
        },
      });
    }),

  downloadData: protectedProcedure.mutation(async ({ ctx }) => {
    const user = ctx.session.user;

    const friends = await getCompleteFriendsDetails(user.id);
    const groups = await getCompleteGroupDetails(user.id);

    return { friends, groups };
  }),

  importUsersFromSplitWise: protectedProcedure
    .input(
      z.object({
        usersWithBalance: z.array(SplitwiseUserSchema),
        groups: z.array(SplitwiseGroupSchema),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await importUserBalanceFromSplitWise(ctx.session.user.id, input.usersWithBalance);
      await importGroupFromSplitwise(ctx.session.user.id, input.groups);
    }),

  getWebPushPublicKey: protectedProcedure.query(() => {
    return env.WEB_PUSH_PUBLIC_KEY ?? '';
  }),

  updatePreferredLanguage: protectedProcedure
    .input(z.object({ language: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { language } = input;

      await db.user.update({
        where: { id: ctx.session.user.id },
        data: { preferredLanguage: language },
      });

      return { success: true };
    }),
});

export type UserRouter = typeof userRouter;
