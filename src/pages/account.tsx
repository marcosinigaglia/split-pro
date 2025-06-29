import {
  ChevronRight,
  Download,
  DownloadCloud,
  FileDown,
  Github,
  HeartHandshakeIcon,
  Star,
} from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import i18nConfig from 'next-i18next.config.js';

import { SubmitFeedback } from '~/components/Account/SubmitFeedback';
import { SubscribeNotification } from '~/components/Account/SubscribeNotification';
import { UpdateName } from '~/components/Account/UpdateDetails';
import { LanguageChanger } from '~/components/Account/LanguageChanger';
import MainLayout from '~/components/Layout/MainLayout';
import { UserAvatar } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { AppDrawer } from '~/components/ui/drawer';
import { LoadingSpinner } from '~/components/ui/spinner';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';

const AccountPage: NextPageWithUser = ({ user }) => {
  const { t } = useTranslation('account_page');
  const { t: tCommon } = useTranslation('common');
  const userQuery = api.user.me.useQuery();
  const downloadQuery = api.user.downloadData.useMutation();
  const updateDetailsMutation = api.user.updateUserDetail.useMutation();

  const [downloading, setDownloading] = useState(false);

  async function downloadData() {
    setDownloading(true);
    const data = await downloadQuery.mutateAsync();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'splitpro_data.json';
    link.click();
    URL.revokeObjectURL(url);
    setDownloading(false);
  }

  const utils = api.useUtils();

  async function onNameUpdate(values: { name: string }) {
    try {
      await updateDetailsMutation.mutateAsync({ name: values.name });
      toast.success(t('ui.messages.submit_success'), { duration: 1500 });
      utils.user.me.refetch().catch(console.error);
    } catch (error) {
      toast.error(t('ui.messages.submit_error'));

      console.error(error);
    }
  }

  return (
    <>
      <Head>
        <title>{t('ui.title')}</title>
      </Head>
      <MainLayout 
        title={t('ui.title')} 
        t={tCommon}
        header={<div className="text-3xl font-semibold">{t('ui.title')}</div>}
      >
        <div className="mt-4 px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UserAvatar user={user} size={50} />
              <div>
                <div className="text-xl font-semibold">{userQuery.data?.name}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </div>
            </div>
            {!userQuery.isPending && (
              <UpdateName
                className="size-5"
                defaultName={userQuery.data?.name ?? ''}
                onNameSubmit={onNameUpdate}
              />
            )}
          </div>
          <div className="mt-8 flex flex-col gap-4">
            <LanguageChanger t={t} />
            <Link href="https://twitter.com/KM_Koushik_" target="_blank">
              <Button
                variant="ghost"
                className="text-md hover:text-foreground/80 w-full justify-between px-0"
              >
                <div className="flex items-center gap-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 1200 1227"
                    fill="none"
                    className="h-5 w-5 px-1"
                  >
                    <g clip-path="url(#clip0_1_2)">
                      <path
                        d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z"
                        fill="white"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_1_2">
                        <rect width="1200" height="1227" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                  {t('ui.follow_on_x')}
                </div>
                <ChevronRight className="h-6 w-6 text-gray-500" />
              </Button>
            </Link>
            <Link href="https://github.com/oss-apps/split-pro" target="_blank">
              <Button
                variant="ghost"
                className="text-md hover:text-foreground/80 w-full justify-between px-0"
              >
                <div className="flex items-center gap-4">
                  <Github className="h-5 w-5 text-gray-200" />
                  {t('ui.star_on_github')}
                </div>
                <ChevronRight className="h-6 w-6 text-gray-500" />
              </Button>
            </Link>
            <Link href="https://github.com/sponsors/KMKoushik" target="_blank">
              <Button
                variant="ghost"
                className="text-md hover:text-foreground/80 w-full justify-between px-0"
              >
                <div className="flex items-center gap-4">
                  <HeartHandshakeIcon className="h-5 w-5 text-pink-600" />
                  {t('ui.support_us')}
                </div>
                <ChevronRight className="h-6 w-6 text-gray-500" />
              </Button>
            </Link>
            <SubmitFeedback t={t} />
            <SubscribeNotification t={t} />
            <Link href="https://www.producthunt.com/products/splitpro/reviews/new" target="_blank">
              <Button
                variant="ghost"
                className="text-md hover:text-foreground/80 w-full justify-between px-0"
              >
                <div className="flex items-center gap-4">
                  <Star className="h-5 w-5 text-yellow-400" />
                  {t('ui.write_review')}
                </div>
                <ChevronRight className="h-6 w-6 text-gray-500" />
              </Button>
            </Link>
            <AppDrawer
              trigger={
                <div className="hover:text-foreground/80 flex w-full justify-between px-0 py-2 text-[16px] font-medium text-gray-300">
                  <div className="flex items-center gap-4">
                    <Download className="h-5 w-5 text-blue-500" />
                    {t('ui.download_app')}
                  </div>
                  <ChevronRight className="h-6x w-6 text-gray-500" />
                </div>
              }
              leftAction={t('ui.download_app_details.close')}
              title={t('ui.download_app_details.title')}
              className="h-[70vh]"
              shouldCloseOnAction
            >
              <div className="flex flex-col gap-8">
                <p>{t('ui.download_app_details.download_as_pwa')}</p>

                <p>
                  {t('ui.download_app_details.using_ios')}{' '}
                  <a
                    className="text-cyan-500 underline"
                    href="https://youtube.com/shorts/MQHeLOjr350"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('ui.download_app_details.video')}
                  </a>
                </p>

                <p>
                  {t('ui.download_app_details.using_android')}{' '}
                  <a
                    className="text-cyan-500 underline"
                    href="https://youtube.com/shorts/04n7oKGzgOs"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('ui.download_app_details.video')}
                  </a>
                </p>
              </div>
            </AppDrawer>
            <Button
              variant="ghost"
              className="text-md hover:text-foreground/80 w-full justify-between px-0"
              onClick={downloadData}
              disabled={downloading}
            >
              <div className="flex items-center gap-4">
                <FileDown className="h-5 w-5 text-teal-500" />
                {t('ui.download_splitpro_data')}
              </div>
              {downloading ? (
                <LoadingSpinner />
              ) : (
                <ChevronRight className="h-6 w-6 text-gray-500" />
              )}
            </Button>
            <Link href="/import-splitwise">
              <Button
                variant="ghost"
                className="text-md hover:text-foreground/80 w-full justify-between px-0"
              >
                <div className="flex items-center gap-4">
                  <DownloadCloud className="h-5 w-5 text-violet-500" />
                  {t('ui.import_from_splitwise')}
                </div>
                <ChevronRight className="h-6 w-6 text-gray-500" />
              </Button>
            </Link>
          </div>

          <div className="mt-2 flex justify-center">
            <Button
              variant="ghost"
              className="text-orange-600 hover:text-orange-600/90"
              onClick={() => signOut()}
            >
              {t('ui.logout')}
            </Button>
          </div>
        </div>
      </MainLayout>
    </>
  );
};

AccountPage.auth = true;

export const getStaticProps = async ({ locale }: { locale: string }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'account_page'], i18nConfig)),
    },
  };
};

export default AccountPage;
