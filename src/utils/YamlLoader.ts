import yaml from 'js-yaml';
import { NarrativeEvent } from '../data/types';

export async function loadYaml(url: string): Promise<NarrativeEvent> {
  const response = await fetch(url);
  const text = await response.text();
  return yaml.load(text) as NarrativeEvent;
}

export async function loadMultipleYaml(urls: string[]): Promise<NarrativeEvent[]> {
  return Promise.all(urls.map(loadYaml));
}
