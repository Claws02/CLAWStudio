import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import type { Brand, Scene, Timeline, Video } from './content/types';
import { Backdrop, Chrome } from './components/Chrome';
import { Hook } from './scenes/Hook';
import { Lineup } from './scenes/Lineup';
import { SpecTable } from './scenes/SpecTable';
import { Versus } from './scenes/Versus';
import { ScenarioScene } from './scenes/ScenarioScene';
import { Scorecard } from './scenes/Scorecard';
import { Takeaway } from './scenes/Takeaway';
import { Outro } from './scenes/Outro';

export type VideoProps = {
  video: Video;
  brand: Brand;
  timeline: Timeline;
};

const renderScene = (scene: Scene, video: Video, brand: Brand): React.ReactNode => {
  switch (scene.type) {
    case 'hook':
      return <Hook video={video} brand={brand} text={scene.text} sub={scene.sub} />;
    case 'lineup':
      return <Lineup video={video} title={scene.title} />;
    case 'spec':
      return <SpecTable video={video} title={scene.title} rows={scene.rows} />;
    case 'versus':
      return <Versus video={video} a={scene.a} b={scene.b} title={scene.title} />;
    case 'scenario':
      return <ScenarioScene video={video} scenarioId={scene.id} />;
    case 'scorecard':
      return <Scorecard video={video} title={scene.title} />;
    case 'takeaway':
      return <Takeaway title={scene.title} bullets={scene.bullets} accent={brand.accent} />;
    case 'outro':
      return <Outro brand={brand} text={scene.text} sub={scene.sub} />;
    default:
      return null;
  }
};

export const ComparisonVideo: React.FC<VideoProps> = ({ video, brand, timeline }) => (
  <AbsoluteFill>
    <Backdrop />
    {timeline.entries.map((entry) => {
      const scene = video.scenes[entry.index];
      if (!scene) return null;
      return (
        <Sequence
          key={entry.index}
          from={entry.from}
          durationInFrames={entry.durationInFrames}
          layout="none"
        >
          {entry.voice ? <Audio src={staticFile(entry.voice)} /> : null}
          <AbsoluteFill>{renderScene(scene, video, brand)}</AbsoluteFill>
        </Sequence>
      );
    })}
    <Chrome brand={brand} subject={video.subject} />
  </AbsoluteFill>
);
