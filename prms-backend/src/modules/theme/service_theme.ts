import { prisma } from '../../db';

export class ThemeService {
  async getPublishedTheme() {
    return prisma.theme.findFirst({
      where: { isPublished: true },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
  }

  async getDraft(themeId: string) {
    return prisma.themeDraft.findFirst({ where: { themeId } });
  }

  async saveDraft(themeId: string, lightConfig: any, darkConfig: any) {
    let draft = await prisma.themeDraft.findFirst({ where: { themeId } });
    if (draft) {
      return prisma.themeDraft.update({
        where: { id: draft.id },
        data: { lightConfig, darkConfig },
      });
    }
    return prisma.themeDraft.create({
      data: { themeId, lightConfig, darkConfig },
    });
  }

  async publishDraft(themeId: string) {
    const theme = await prisma.theme.findUnique({ where: { id: themeId } });
    if (!theme) throw new Error('Theme not found');

    const draft = await prisma.themeDraft.findFirst({ where: { themeId } });
    if (!draft) throw new Error('No draft found');

    const maxVersion = await prisma.themeVersion.findFirst({
      where: { themeId },
      orderBy: { version: 'desc' },
    });

    return prisma.themeVersion.create({
      data: {
        themeId,
        version: (maxVersion?.version || 0) + 1,
        lightConfig: draft.lightConfig as any,
        darkConfig: draft.darkConfig as any,
      },
    });
  }

  async getVersions(themeId: string) {
    return prisma.themeVersion.findMany({
      where: { themeId },
      orderBy: { version: 'desc' },
    });
  }

  async restoreVersion(themeId: string, version: number) {
    const versionRecord = await prisma.themeVersion.findFirst({
      where: { themeId, version },
    });
    if (!versionRecord) throw new Error('Version not found');

    let draft = await prisma.themeDraft.findFirst({ where: { themeId } });
    if (draft) {
      return prisma.themeDraft.update({
        where: { id: draft.id },
        data: {
          lightConfig: versionRecord.lightConfig as any,
          darkConfig: versionRecord.darkConfig as any,
        },
      });
    }
    return prisma.themeDraft.create({
      data: {
        themeId,
        lightConfig: versionRecord.lightConfig as any,
        darkConfig: versionRecord.darkConfig as any,
      },
    });
  }
}
