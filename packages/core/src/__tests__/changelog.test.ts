import dedent from 'dedent';
import Changelog, { IGenerateReleaseNotesOptions } from '../changelog';
import LogParse from '../log-parse';
import { defaultLabelDefinition } from '../release';
import { dummyLog } from '../utils/logger';

import makeCommitFromMsg from './make-commit-from-msg';

const testOptions = (): IGenerateReleaseNotesOptions => ({
  owner: 'foobar',
  repo: 'auto',
  baseUrl: 'https://github.custom.com/foobar/auto',
  labels: defaultLabelDefinition,
  baseBranch: 'master'
});

const logParse = new LogParse();

describe('createUserLink', () => {
  test('should ', () => {
    const changelog = new Changelog(dummyLog(), {
      owner: '',
      repo: '',
      baseUrl: 'https://github.custom.com/',
      labels: defaultLabelDefinition,
      baseBranch: 'master'
    });
    changelog.loadDefaultHooks();

    expect(
      changelog.createUserLink(
        {
          name: 'none',
          email: undefined,
          username: 'invalid-email-address'
        },
        {
          hash: '1',
          labels: [],
          pullRequest: {
            number: 22
          },
          authorName: 'none',
          authorEmail: 'default@email.com',
          authors: [
            {
              name: 'none',
              email: undefined
            }
          ],
          subject: ''
        }
      )
    ).toBe(undefined);
  });

  test('should find email', () => {
    const changelog = new Changelog(dummyLog(), {
      owner: '',
      repo: '',
      baseUrl: 'https://github.custom.com/',
      labels: defaultLabelDefinition,
      baseBranch: 'master'
    });
    changelog.loadDefaultHooks();

    expect(
      changelog.createUserLink(
        {
          name: 'none',
          email: undefined
        },
        {
          hash: '1',
          labels: [],
          pullRequest: {
            number: 22
          },
          authorName: 'none',
          authorEmail: 'default@email.com',
          authors: [
            {
              name: 'none',
              email: undefined
            }
          ],
          subject: ''
        }
      )
    ).toBe('default@email.com');
  });
});

describe('Hooks', () => {
  test('title', async () => {
    const changelog = new Changelog(dummyLog(), testOptions());
    const normalized = await logParse.normalizeCommits([
      makeCommitFromMsg('Some Feature (#1234)')
    ]);

    changelog.hooks.renderChangelogTitle.tap(
      'test',
      (label, changelogTitles) => `:heart: ${changelogTitles[label]} :heart:`
    );
    changelog.loadDefaultHooks();

    expect(await changelog.generateReleaseNotes(normalized)).toMatchSnapshot();
  });

  test('author', async () => {
    const changelog = new Changelog(dummyLog(), testOptions());
    const normalized = await logParse.normalizeCommits([
      makeCommitFromMsg('Some Feature (#1234)')
    ]);

    changelog.hooks.renderChangelogAuthor.tap(
      'test',
      (author, commit) => `:heart: ${author.name}/${commit.authorEmail} :heart:`
    );

    changelog.hooks.renderChangelogAuthorLine.tap(
      'test',
      (author, user) => `:shipit: ${author.name} (${user})`
    );
    changelog.loadDefaultHooks();

    expect(await changelog.generateReleaseNotes(normalized)).toMatchSnapshot();
  });
});

describe('generateReleaseNotes', () => {
  test('should create note for PR commits', async () => {
    const changelog = new Changelog(dummyLog(), testOptions());
    changelog.loadDefaultHooks();
    const normalized = await logParse.normalizeCommits([
      makeCommitFromMsg('Some Feature (#1234)', { labels: ['minor'] })
    ]);

    expect(await changelog.generateReleaseNotes(normalized)).toMatchSnapshot();
  });

  test('should omit authors with invalid email addresses', async () => {
    const changelog = new Changelog(dummyLog(), testOptions());
    changelog.loadDefaultHooks();
    const normalized = await logParse.normalizeCommits([
      makeCommitFromMsg('Some Feature (#1234)', { labels: ['minor'] })
    ]);
    normalized[0].authors[0].username = 'invalid-email-address';

    expect(await changelog.generateReleaseNotes(normalized)).toMatchSnapshot();
  });

  test('should create note for PR commits without labels', async () => {
    const changelog = new Changelog(dummyLog(), testOptions());
    changelog.loadDefaultHooks();
    const normalized = await logParse.normalizeCommits([
      makeCommitFromMsg('Some Feature (#1234)')
    ]);

    expect(await changelog.generateReleaseNotes(normalized)).toMatchSnapshot();
  });

  test('should create note for PR commits with only non config labels', async () => {
    const changelog = new Changelog(dummyLog(), testOptions());
    changelog.loadDefaultHooks();
    const normalized = await logParse.normalizeCommits([
      makeCommitFromMsg('Some Feature (#1234)', {
        labels: ['someOtherNonConfigLabel']
      })
    ]);

    expect(await changelog.generateReleaseNotes(normalized)).toMatchSnapshot();
  });

  test('should use username if present', async () => {
    const changelog = new Changelog(dummyLog(), testOptions());
    changelog.loadDefaultHooks();
    const normalized = await logParse.normalizeCommits([
      makeCommitFromMsg('Some Feature (#1234)', {
        labels: ['minor'],
        username: 'adam'
      })
    ]);

    normalized[0].authors[0].username = 'adam';

    expect(await changelog.generateReleaseNotes(normalized)).toMatchSnapshot();
  });

  test('should combine pr w/no label and labelled pr', async () => {
    const changelog = new Changelog(dummyLog(), testOptions());
    changelog.loadDefaultHooks();
    const normalized = await logParse.normalizeCommits([
      makeCommitFromMsg('Some Feature (#1234)'),
      makeCommitFromMsg('Third', { labels: ['patch'] })
    ]);

    expect(await changelog.generateReleaseNotes(normalized)).toMatchSnapshot();
  });

  test('should include prs with released label', async () => {
    const changelog = new Changelog(dummyLog(), testOptions());
    changelog.loadDefaultHooks();
    const normalized = await logParse.normalizeCommits([
      makeCommitFromMsg('Some Feature (#1234)', { labels: ['released'] }),
      makeCommitFromMsg('Third', { labels: ['patch'] })
    ]);

    expect(await changelog.generateReleaseNotes(normalized)).toMatchSnapshot();
  });

  test("should use only email if author name doesn't exist", async () => {
    const changelog = new Changelog(dummyLog(), testOptions());
    changelog.loadDefaultHooks();
    const commits = await logParse.normalizeCommits([
      {
        hash: 'foo',
        labels: [],
        authorEmail: 'adam@dierkens.com',
        subject: 'Another Feature (#1234)'
      },
      {
        hash: 'foo',
        labels: [],
        subject: 'One Feature (#1235)'
      }
    ]);

    expect(await changelog.generateReleaseNotes(commits)).toMatchSnapshot();
  });

  test('should include PR-less commits as patches', async () => {
    const changelog = new Changelog(dummyLog(), testOptions());
    changelog.loadDefaultHooks();

    const commits = await logParse.normalizeCommits([
      {
        hash: '1',
        authorName: 'Adam Dierkens',
        authorEmail: 'adam@dierkens.com',
        subject: 'I was a push to master\n\n',
        labels: ['pushToBaseBranch']
      },
      {
        hash: '2',
        authorName: 'Adam Dierkens',
        authorEmail: 'adam@dierkens.com',
        subject: 'First Feature (#1235)',
        labels: ['minor']
      }
    ]);

    expect(await changelog.generateReleaseNotes(commits)).toMatchSnapshot();
  });

  test('should order the section major, minor, patch, then the rest', async () => {
    const options = testOptions();
    options.labels = {
      documentation: options.labels.documentation,
      internal: options.labels.internal,
      patch: options.labels.patch,
      minor: options.labels.minor,
      major: options.labels.major
    };

    const changelog = new Changelog(dummyLog(), options);
    changelog.loadDefaultHooks();

    const commits = await logParse.normalizeCommits([
      {
        hash: '0a',
        authorName: 'Adam Dierkens',
        authorEmail: 'adam@dierkens.com',
        subject: 'something\n\n',
        labels: ['internal']
      },
      {
        hash: '0',
        authorName: 'Adam Dierkens',
        authorEmail: 'adam@dierkens.com',
        subject: 'docs\n\n',
        labels: ['documentation']
      },

      {
        hash: '1',
        authorName: 'Adam Dierkens',
        authorEmail: 'adam@dierkens.com',
        subject: 'I was a push to master\n\n',
        labels: ['patch']
      },
      {
        hash: '2',
        authorName: 'Adam Dierkens',
        authorEmail: 'adam@dierkens.com',
        subject: 'First Feature (#1235)',
        labels: ['minor']
      },
      {
        hash: '2',
        authorName: 'Adam Dierkens',
        authorEmail: 'adam@dierkens.com',
        subject: 'First Feature (#1235)',
        labels: ['major']
      }
    ]);

    expect(await changelog.generateReleaseNotes(commits)).toMatchSnapshot();
  });

  test('should be able to customize pushToBaseBranch title', async () => {
    const options = testOptions();
    options.labels = {
      ...options.labels,
      pushToBaseBranch: [
        {
          name: 'pushToBaseBranch',
          title: 'Custom Title',
          description: 'N/A'
        }
      ]
    };

    const changelog = new Changelog(dummyLog(), options);
    changelog.loadDefaultHooks();

    const commits = await logParse.normalizeCommits([
      {
        hash: '1',
        authorName: 'Adam Dierkens',
        authorEmail: 'adam@dierkens.com',
        subject: 'I was a push to master\n\n',
        labels: ['pushToBaseBranch']
      },
      {
        hash: '2',
        authorName: 'Adam Dierkens',
        authorEmail: 'adam@dierkens.com',
        subject: 'First Feature (#1235)',
        labels: ['minor']
      }
    ]);

    expect(await changelog.generateReleaseNotes(commits)).toMatchSnapshot();
  });

  test('should be able to customize titles', async () => {
    const options = testOptions();
    options.labels = {
      ...options.labels,
      minor: [
        {
          name: 'Version: Minor',
          title: 'Woo Woo New Features',
          description: 'N/A'
        }
      ]
    };

    const changelog = new Changelog(dummyLog(), options);
    changelog.loadDefaultHooks();

    const commits = await logParse.normalizeCommits([
      {
        hash: '2',
        authorName: 'Adam Dierkens',
        authorEmail: 'adam@dierkens.com',
        subject: 'First Feature (#1235)',
        labels: ['Version: Minor']
      }
    ]);

    expect(await changelog.generateReleaseNotes(commits)).toMatchSnapshot();
  });

  test('should merge sections with same changelog title', async () => {
    const options = testOptions();
    options.labels = {
      ...options.labels,
      minor: [
        { name: 'new-component', title: 'Enhancement' },
        {
          name: 'Version: Minor',
          title: 'Enhancement',
          description: 'N/A'
        }
      ]
    };

    const changelog = new Changelog(dummyLog(), options);
    changelog.loadDefaultHooks();

    const commits = await logParse.normalizeCommits([
      {
        hash: '3',
        authorName: 'Adam Dierkens',
        authorEmail: 'adam@dierkens.com',
        subject: 'Second Feature (#1236)',
        labels: ['new-component']
      },
      {
        hash: '2',
        authorName: 'Adam Dierkens',
        authorEmail: 'adam@dierkens.com',
        subject: 'First Feature (#1235)',
        labels: ['Version: Minor']
      }
    ]);

    expect(await changelog.generateReleaseNotes(commits)).toMatchSnapshot();
  });

  test('should add additional release notes', async () => {
    const changelog = new Changelog(dummyLog(), testOptions());
    changelog.loadDefaultHooks();

    const commits = await logParse.normalizeCommits([
      {
        hash: '2',
        authorName: 'Adam Dierkens',
        authorEmail: 'adam@dierkens.com',
        subject: 'First Feature (#1235)',
        labels: ['minor']
      }
    ]);
    commits[0].pullRequest!.body = dedent`
      # Why

      Some words

      ## Release Notes

      Here is how you upgrade

      ## Todo

      - [ ] add tests
    `;

    expect(await changelog.generateReleaseNotes(commits)).toMatchSnapshot();
  });

  test('additional release notes should be able to contain sub-headers', async () => {
    const changelog = new Changelog(dummyLog(), testOptions());
    changelog.loadDefaultHooks();

    const commits = await logParse.normalizeCommits([
      {
        hash: '2',
        authorName: 'Adam Dierkens',
        authorEmail: 'adam@dierkens.com',
        subject: 'First Feature (#1235)',
        labels: ['minor']
      }
    ]);
    commits[0].pullRequest!.body = dedent`
      # Why

      Some words

      ## Release Notes

      Here is how you upgrade

      ### Things you should really know

      Bam!?

      ## Todo

      - [ ] add tests
    `;

    expect(await changelog.generateReleaseNotes(commits)).toMatchSnapshot();
  });

  test("doesn't add additional release notes when there are none", async () => {
    const changelog = new Changelog(dummyLog(), testOptions());
    changelog.loadDefaultHooks();

    const commits = await logParse.normalizeCommits([
      {
        hash: '2',
        authorName: 'Adam Dierkens',
        authorEmail: 'adam@dierkens.com',
        subject: 'First Feature (#1235)',
        labels: ['minor']
      }
    ]);
    commits[0].pullRequest!.body = dedent`
      # Why

      Some words
    `;

    const res = await changelog.generateReleaseNotes(commits);
    expect(res).toMatchSnapshot();
  });

  test('additional release notes should omit renovate prs', async () => {
    const changelog = new Changelog(dummyLog(), testOptions());
    changelog.loadDefaultHooks();

    const commits = await logParse.normalizeCommits([
      {
        hash: '2',
        authorName: 'Adam Dierkens',
        authorEmail: 'adam@dierkens.com',
        subject: 'First Feature (#1235)',
        labels: ['minor']
      }
    ]);
    commits[0].authors[0].username = 'renovate-bot';
    commits[0].pullRequest!.body = dedent`
      # Why

      Some words

      ## Release Notes

      Here is how you upgrade

      ### Things you should really know

      Bam!?

      ## Todo

      - [ ] add tests
    `;

    expect(await changelog.generateReleaseNotes(commits)).toMatchSnapshot();
  });

  test('additional release notes should have tappable omit', async () => {
    const changelog = new Changelog(dummyLog(), testOptions());
    changelog.loadDefaultHooks();

    changelog.hooks.omitReleaseNotes.tap('test', commit => {
      if (commit.labels.includes('no-notes')) {
        return true;
      }
    });

    const commits = await logParse.normalizeCommits([
      {
        hash: '2',
        authorName: 'Adam Dierkens',
        authorEmail: 'adam@dierkens.com',
        subject: 'First Feature (#1235)',
        labels: ['minor', 'no-notes']
      }
    ]);
    commits[0].pullRequest!.body = dedent`
      # Why

      Some words

      ## Release Notes

      Here is how you upgrade

      ### Things you should really know

      Bam!?

      ## Todo

      - [ ] add tests
    `;

    expect(await changelog.generateReleaseNotes(commits)).toMatchSnapshot();
  });
});
