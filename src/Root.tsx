import React from 'react';
import { Composition } from 'remotion';
import { brand, videos } from './content/generated';
import { ALL_FORMATS, FORMATS } from './design/layout';
import { buildTimeline } from './content/timeline';
import { ComparisonVideo, type VideoProps } from './Video';
import type { FormatKind } from './content/types';

export const FPS = 30;

/** Composition id shown in the studio and passed to `npm run render`. */
export const compositionId = (videoId: string, format: FormatKind): string => `${videoId}--${format}`;

export const RemotionRoot: React.FC = () => (
  <>
    {videos.flatMap((video) => {
      const formats = video.formats ?? ALL_FORMATS;
      return formats.map((format) => {
        const spec = FORMATS[format];
        return (
          <Composition
            key={compositionId(video.id, format)}
            id={compositionId(video.id, format)}
            component={ComparisonVideo}
            width={spec.width}
            height={spec.height}
            fps={FPS}
            // Placeholder: calculateMetadata replaces this with the real length
            // once the voiceover durations are probed.
            durationInFrames={FPS * 30}
            defaultProps={
              {
                video,
                brand,
                timeline: { fps: FPS, total: FPS * 30, entries: [] },
              } satisfies VideoProps
            }
            calculateMetadata={async ({ props }) => {
              const timeline = await buildTimeline(props.video, props.brand, FPS, format);
              return {
                durationInFrames: timeline.total,
                props: { ...props, timeline },
              };
            }}
          />
        );
      });
    })}
  </>
);
