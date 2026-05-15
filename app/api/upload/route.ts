import {handleUpload, HandleUploadBody} from "@vercel/blob/client";
import {NextResponse} from "next/server";
import {auth} from "@clerk/nextjs/server";
import {MAX_FILE_SIZE} from "@/lib/constants";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      token: process.env.dialogra_READ_WRITE_TOKEN,
      body,
      request,
      onBeforeGenerateToken: async () => {
        const {userId} = await auth();

        if (!userId) {
          throw new Error('Unauthorized: user not authenticated');
        }

        return {
          allowedContentTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
          addRandomSuffix: true,
          maximumSizeInBytes: MAX_FILE_SIZE,
          tokenPayload: JSON.stringify({userId}),
        }
      },
      onUploadCompleted: async ({blob, tokenPayload}) => {
        console.log('Upload completed:', blob.url);

        if (tokenPayload) {
          JSON.parse(tokenPayload);
        }

        // TODO: PostHog
      }
    });

    return NextResponse.json(jsonResponse);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Something went wrong";
    const status = message.includes("Unauthorized") ? 401 : 500;
    console.error('Upload error:', e);
    const clientMessage = status === 401 ? 'Unauthorized: user not authenticated' : 'Upload failed';
    return NextResponse.json({error: clientMessage}, {status});
  }
}