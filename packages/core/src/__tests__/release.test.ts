import merge from 'deepmerge';
import { parse } from 'graphql';
import Git from '../git';
import LogParse from '../log-parse';
import Release, {
  buildSearchQuery,
  defaultLabelDefinition,
  getVersionMap
} from '../release';
import SEMVER from '../semver';
import { dummyLog } from '../utils/logger';
import makeCommitFromMsg from './make-commit-from-msg';

const constructor = jest.fn();
const getGitLog = jest.fn();
const graphql = jest.fn();
const getPr = jest.fn();
const getPullRequest = jest.fn();
const getLatestRelease = jest.fn();
const getSha = jest.fn();
const createStatus = jest.fn();
const getProject = jest.fn();
const createComment = jest.fn();
const changedPackages = jest.fn();
const getCommitsForPR = jest.fn().mockReturnValue(Promise.resolve(undefined));
const getUserByEmail = jest.fn();
const getUserByUsername = jest.fn();
const getProjectLabels = jest.fn();
const createLabel = jest.fn();
const updateLabel = jest.fn();
const getPullRequests = jest.fn();
const getLatestReleaseInfo = jest.fn();
const searchRepo = jest.fn();
const getCommitDate = jest.fn();
const getFirstCommit = jest.fn();

getProject.mockResolvedValue({
  html_url: 'https://github.com/web/site'
});

const mockLabels = (labels: string[]) => ({
  data: { labels: labels.map(label => ({ name: label })), user: {} }
});

// @ts-ignore
jest.mock('../git.ts', () => (...args) => {
  constructor(...args);
  return {
    options: { owner: 'test', repo: 'test', version: '1.0.0' },
    graphql,
    getGitLog,
    getPr,
    getLatestRelease,
    getPullRequest,
    getSha,
    createStatus,
    createComment,
    getProject,
    changedPackages,
    getCommitsForPR,
    getUserByUsername,
    getUserByEmail,
    getProjectLabels,
    createLabel,
    updateLabel,
    getPullRequests,
    getLatestReleaseInfo,
    searchRepo,
    getCommitDate,
    getFirstCommit
  };
});

getGitLog.mockReturnValue([]);

const execSpy = jest.fn();
// @ts-ignore
jest.mock('../utils/exec-promise.ts', () => (...args) => execSpy(...args));

const existsSync = jest.fn();
const writeSpy = jest.fn();

let readResult = '{}';

jest.mock('fs', () => ({
  // @ts-ignore
  existsSync: (...args) => existsSync(...args),
  // @ts-ignore
  readFile: (a, b, cb) => {
    cb(undefined, readResult);
  },
  // @ts-ignore
  ReadStream: () => undefined,
  // @ts-ignore
  WriteStream: () => undefined,
  // @ts-ignore
  closeSync: () => undefined,
  // @ts-ignore
  writeFile: (file, data, cb) => {
    cb(undefined, writeSpy(file, data));
  }
}));

const logParse = new LogParse();
const git = new Git({
  owner: 'Andrew',
  repo: 'test',
  token: 'MY_TOKEN'
});

describe('getVersionMap', () => {
  test('should return the default map', () => {
    expect(getVersionMap()).toEqual(
      new Map([
        ['major', ['major']],
        ['minor', ['minor']],
        ['patch', ['patch']],
        ['skip-release', ['skip-release']],
        ['release', ['release']],
        ['prerelease', ['prerelease']]
      ])
    );
  });

  test('should add custom labels', () => {
    expect(
      getVersionMap({ major: [{ name: 'major' }, { name: 'BREAKING' }] })
    ).toEqual(new Map([['major', ['major', 'BREAKING']]]));
  });
});

describe('Release', () => {
  beforeEach(() => {
    getGitLog.mockClear();
    getPr.mockClear();
    writeSpy.mockClear();
    execSpy.mockClear();
    execSpy.mockClear();
    createLabel.mockClear();
  });

  test('should use options owner, repo, and token', async () => {
    const gh = new Release(git);

    await gh.getCommits('12345');

    expect(constructor.mock.calls[0][0].owner).toBe('Andrew');
    expect(constructor.mock.calls[0][0].repo).toBe('test');
  });

  describe('getCommits', () => {
    test('should default to HEAD', async () => {
      const gh = new Release(git);
      await gh.getCommits('12345');
      expect(getGitLog).toHaveBeenCalled();
    });

    test('should use configured HEAD', async () => {
      const gh = new Release(git);
      await gh.getCommits('12345', '1234');
      expect(getGitLog).toHaveBeenCalled();
    });

    test('should not resolve authors with no PR commits', async () => {
      const commits = [
        makeCommitFromMsg('First'),
        makeCommitFromMsg('Second'),
        makeCommitFromMsg('Third')
      ];

      getGitLog.mockReturnValueOnce(commits);
      const gh = new Release(git);
      await gh.getCommits('12345', '1234');
      expect(getUserByUsername).not.toHaveBeenCalled();
    });

    test('should resolve authors with PR commits', async () => {
      const commits = await logParse.normalizeCommits([
        makeCommitFromMsg('First'),
        makeCommitFromMsg('Second (#123)', {
          name: 'Andrew Lisowski',
          email: 'andrew@users.noreply.github.com'
        }),
        makeCommitFromMsg('Second (#123)', {
          name: 'Andrew Lisowski',
          email: 'lisowski54@gmail.com'
        }),
        makeCommitFromMsg('Third')
      ]);

      getGitLog.mockReturnValueOnce(commits);
      getCommitsForPR.mockReturnValueOnce(
        Promise.resolve([
          {
            author: {
              login: 'andrew'
            }
          }
        ])
      );
      getUserByUsername.mockReturnValueOnce({
        login: 'andrew',
        name: 'Andrew Lisowski'
      });
      getUserByEmail.mockReturnValueOnce({
        login: 'adam',
        name: 'Adam Dierkens'
      });
      getUserByEmail.mockReturnValueOnce({
        login: 'adam',
        name: 'Adam Dierkens'
      });

      const gh = new Release(git);
      const modifiedCommits = await gh.getCommits('12345', '1234');
      expect(getUserByUsername).toHaveBeenCalled();
      expect(modifiedCommits).toMatchSnapshot();
    });

    test('should be able to omit by username', async () => {
      const commits = await logParse.normalizeCommits([
        makeCommitFromMsg('First'),
        makeCommitFromMsg('Second (#123)', {
          name: 'Andrew Lisowski',
          email: 'lisowski54@gmail.com'
        }),
        makeCommitFromMsg('Third')
      ]);

      getGitLog.mockReturnValueOnce(commits);
      getCommitsForPR.mockReturnValueOnce(
        Promise.resolve([
          {
            author: {
              login: 'andrew'
            }
          }
        ])
      );
      getUserByUsername.mockReturnValueOnce({
        login: 'andrew',
        name: 'Andrew Lisowski'
      });
      getUserByEmail.mockReturnValueOnce({
        login: 'adam',
        name: 'Adam Dierkens'
      });
      getUserByEmail.mockReturnValueOnce({
        login: 'adam',
        name: 'Adam Dierkens'
      });

      const gh = new Release(git);
      gh.hooks.onCreateLogParse.tap('test', parser => {
        parser.hooks.omitCommit.tap('test', commit =>
          Boolean(commit.authors.find(author => author.username === 'adam'))
        );
      });
      const modifiedCommits = await gh.getCommits('12345', '1234');
      expect(modifiedCommits).toMatchSnapshot();
    });

    test('should ignore rebased commits if no last release', async () => {
      const gh = new Release(git);

      getLatestReleaseInfo.mockReturnValueOnce({});
      const commits = await logParse.normalizeCommits([
        makeCommitFromMsg('Second (#123)')
      ]);

      getGitLog.mockReturnValueOnce(commits);

      expect(await gh.getCommits('12345', '1234')).toMatchSnapshot();
    });

    test('should match rebased commits to PRs', async () => {
      const gh = new Release(git);

      getLatestReleaseInfo.mockReturnValueOnce({
        published_at: '2019-01-16'
      });
      searchRepo.mockReturnValueOnce({ items: [{ number: 123 }] });
      getPullRequest.mockReturnValueOnce({
        data: {
          number: 123,
          merge_commit_sha: '1a2b',
          labels: [{ name: 'skip-release' }, { name: 'minor' }]
        }
      });
      getGitLog.mockReturnValueOnce(
        await logParse.normalizeCommits([
          makeCommitFromMsg('Feature (#124)'),
          makeCommitFromMsg('I was rebased', {
            hash: '1a2b'
          })
        ])
      );

      expect(await gh.getCommits('12345', '1234')).toMatchSnapshot();
    });

    test('should match rebased commits to PRs with first commit', async () => {
      const gh = new Release(git);

      getLatestReleaseInfo.mockImplementationOnce(() => {
        throw new Error('no releases yet');
      });
      getCommitDate.mockReturnValueOnce('2019-01-16');
      searchRepo.mockReturnValueOnce({ items: [{ number: 123 }] });
      getPullRequest.mockReturnValueOnce({
        data: {
          number: 123,
          merge_commit_sha: '1a2b',
          labels: [{ name: 'skip-release' }, { name: 'minor' }]
        }
      });
      getGitLog.mockReturnValueOnce(
        await logParse.normalizeCommits([
          makeCommitFromMsg('Feature (#124)'),
          makeCommitFromMsg('I was rebased', {
            hash: '1a2b'
          })
        ])
      );

      expect(await gh.getCommits('12345', '1234')).toMatchSnapshot();
    });
  });

  describe('addToChangelog', () => {
    test("creates new changelog if one didn't exist", async () => {
      const gh = new Release(git);
      await gh.addToChangelog(
        '# My new Notes',
        'klajsdlfk4lj51l43k5hj234l',
        'v0.0.0'
      );

      expect(writeSpy.mock.calls[0][1].includes(`# My new Notes`)).toBe(true);
    });

    test("creates new changelog if one didn't exist", async () => {
      const gh = new Release(git);
      await gh.addToChangelog('# My new Notes', 'v1.0.0', 'v1.0.0');

      expect(writeSpy.mock.calls[0][1].includes(`v1.0.1`)).toBe(true);
    });

    test('creates changelog with v in versions', async () => {
      const gh = new Release(git, {
        noVersionPrefix: true,
        skipReleaseLabels: ['skip-release'],
        labels: defaultLabelDefinition,
        baseBranch: 'master'
      });
      await gh.addToChangelog('# My new Notes', '1.0.0', '1.0.0');

      expect(writeSpy.mock.calls[0][1].includes(`1.0.1`)).toBe(true);
    });

    test('prepends to old changelog', async () => {
      const gh = new Release(git);

      existsSync.mockReturnValueOnce(true);
      readResult = '# My old Notes';

      await gh.addToChangelog(
        '# My new Notes',
        'asdfasdlkfjlkj435l2j',
        'v0.0.0'
      );
      expect(writeSpy.mock.calls[0][1].includes(readResult)).toBe(true);
    });

    test('should be able to configure message', async () => {
      const gh = new Release(git);
      const message = 'pony foo';

      existsSync.mockReturnValueOnce(true);
      readResult = '# My old Notes';

      await gh.addToChangelog(
        '# My new Notes',
        'asdklfhlkh24387513',
        'v0.0.0',
        message
      );
      expect(execSpy.mock.calls[1][1].includes(`"${message}"`)).toBe(true);
    });
  });

  describe('generateReleaseNotes', () => {
    test('should default to HEAD', async () => {
      const gh = new Release(git);
      expect(await gh.generateReleaseNotes('1234')).toBe('');
    });

    test('should use configured HEAD', async () => {
      const gh = new Release(git);
      expect(await gh.generateReleaseNotes('1234', '123')).toBe('');
    });

    test('should include PR-less commits', async () => {
      const gh = new Release(git);

      const commits = [
        {
          hash: '1',
          authorName: 'Adam Dierkens',
          authorEmail: 'adam@dierkens.com',
          authors: [
            {
              name: 'Adam Dierkens',
              email: 'adam@dierkens.com'
            }
          ],
          subject: 'I should be included\nBut this should not.'
        },
        {
          hash: '2',
          authorName: 'Adam Dierkens',
          authorEmail: 'adam@dierkens.com',
          authors: [
            {
              name: 'Adam Dierkens',
              email: 'adam@dierkens.com'
            }
          ],
          subject: 'First Feature',
          pullRequest: {
            number: '1235'
          }
        },
        {
          hash: '3',
          authorName: 'Adam Dierkens',
          authorEmail: 'adam@dierkens.com',
          authors: [
            {
              name: 'Adam Dierkens',
              email: 'adam@dierkens.com'
            }
          ],
          subject: 'Random Commit for pr 1235'
        }
      ];

      getGitLog.mockReturnValueOnce(commits);
      getCommitsForPR.mockReturnValueOnce(Promise.resolve(undefined));
      getPr.mockReturnValueOnce(mockLabels(['minor']));
      getCommitsForPR.mockReturnValueOnce(Promise.resolve([{ sha: '3' }]));
      graphql.mockReturnValueOnce({
        hash_1: { edges: [] }
      });

      expect(await gh.generateReleaseNotes('1234', '123')).toMatchSnapshot();
    });

    test('should get extra user data for login', async () => {
      const gh = new Release(git);

      const commits = [
        {
          hash: '1',
          authors: [],
          subject: 'I have a login attached',
          pullRequest: {
            number: '1235'
          }
        }
      ];

      getGitLog.mockReturnValueOnce(commits);
      getPr.mockReturnValueOnce({
        data: { labels: [], user: { login: 'adierkens' } }
      });
      getUserByUsername.mockReturnValueOnce({
        login: 'adierkens',
        name: 'Adam Dierkens'
      });

      expect(await gh.generateReleaseNotes('1234', '123')).toMatchSnapshot();
    });

    test('should allow user to configure section headings', async () => {
      const gh = new Release(git);

      const commits = [
        makeCommitFromMsg('First (#1234)'),
        makeCommitFromMsg('Second (#1235)'),
        makeCommitFromMsg('Third (#1236)'),
        makeCommitFromMsg('Fourth (#1237)')
      ];

      getGitLog.mockReturnValueOnce(commits);
      getPr.mockReturnValueOnce(mockLabels(['major']));
      getPr.mockReturnValueOnce(mockLabels(['minor']));
      getPr.mockReturnValueOnce(mockLabels(['documentation', 'internal']));
      getPr.mockReturnValueOnce(mockLabels(['patch']));

      expect(await gh.generateReleaseNotes('1234', '123')).toMatchSnapshot();
    });

    test('should match rebased commits to PRs', async () => {
      const gh = new Release(git);

      getLatestReleaseInfo.mockReturnValueOnce({
        published_at: '2019-01-16'
      });
      getCommitsForPR.mockReturnValueOnce(Promise.resolve(undefined));
      // Rebased PR will have different commit SHAs than the commits in base branch
      getCommitsForPR.mockReturnValueOnce(Promise.resolve([{ sha: '1a1a' }]));

      searchRepo.mockReturnValueOnce({ items: [{ number: 123 }] });
      getPr.mockReturnValueOnce(mockLabels(['minor']));
      getPullRequest.mockReturnValueOnce({
        data: {
          number: 123,
          merge_commit_sha: '1a2b',
          labels: [{ name: 'skip-release' }, { name: 'minor' }]
        }
      });
      getGitLog.mockReturnValueOnce([
        makeCommitFromMsg('Feature (#124)'),
        makeCommitFromMsg('I was rebased\n\n', {
          hash: '1a2b'
        }),
        {
          hash: '1',
          authorName: 'Adam Dierkens',
          authorEmail: 'adam@dierkens.com',
          subject: 'I am a commit to master'
        }
      ]);
      graphql.mockReturnValueOnce({
        hash_1: { edges: [] }
      });

      expect(await gh.generateReleaseNotes('12345', '1234')).toMatchSnapshot();
    });

    test('should match commits with related PRs', async () => {
      const gh = new Release(git);

      getLatestReleaseInfo.mockReturnValueOnce({
        published_at: '2019-01-16'
      });
      getCommitsForPR.mockReturnValueOnce(Promise.resolve(undefined));
      // Rebased PR will have different commit SHAs than the commits in base branch
      getCommitsForPR.mockReturnValueOnce(Promise.resolve([{ sha: '1a1a' }]));

      searchRepo.mockReturnValueOnce({ items: [{ number: 123 }] });
      getPr.mockReturnValueOnce(mockLabels(['minor']));
      getPullRequest.mockReturnValueOnce({
        data: {
          number: 123,
          merge_commit_sha: '1a2b',
          labels: [{ name: 'skip-release' }, { name: 'minor' }]
        }
      });
      getGitLog.mockReturnValueOnce(
        await logParse.normalizeCommits([
          makeCommitFromMsg('Feature (#124)'),
          {
            hash: '1',
            authorName: 'Adam Dierkens',
            authorEmail: 'adam@dierkens.com',
            subject: 'I am a commit with a related PR'
          }
        ])
      );
      searchRepo.mockReturnValueOnce({
        total_count: 1,
        items: [{ labels: [{ name: 'patch' }] }]
      });

      expect(await gh.generateReleaseNotes('12345', '1234')).toMatchSnapshot();
    });

    test('should find matching PRs for shas through search', async () => {
      const gh = new Release(git);

      getGitLog.mockReturnValueOnce([
        makeCommitFromMsg('Doom Patrol enabled', {
          hash: '1'
        }),
        makeCommitFromMsg('Autobots roll out!', {
          hash: '2'
        })
      ]);

      graphql.mockReturnValueOnce({
        hash_1: {
          edges: [
            { node: { labels: { edges: [{ node: { name: 'major' } }] } } }
          ]
        }
      });
      // PR with no label, should become patch
      graphql.mockReturnValueOnce({
        hash_2: {
          edges: [{ node: { labels: undefined } }]
        }
      });

      expect(await gh.generateReleaseNotes('1234', '123')).toMatchSnapshot();
    });

    test('should find ignore closed prs', async () => {
      const gh = new Release(git);

      getGitLog.mockReturnValueOnce([
        makeCommitFromMsg('Doom Patrol enabled', {
          hash: '1'
        }),
        makeCommitFromMsg('Autobots roll out!', {
          hash: '2'
        })
      ]);

      graphql.mockReturnValueOnce({
        hash_1: {
          edges: [
            {
              node: {
                labels: {
                  edges: [{ node: { name: 'major', state: 'CLOSED' } }]
                }
              }
            }
          ]
        }
      });
      // PR with no label, should become patch
      graphql.mockReturnValueOnce({
        hash_2: {
          edges: [{ node: { labels: undefined } }]
        }
      });

      expect(await gh.generateReleaseNotes('1234', '123')).toMatchSnapshot();
    });

    test('should include PRs merged to other PRs', async () => {
      const gh = new Release(git);

      getGitLog.mockReturnValueOnce([
        makeCommitFromMsg('Doom (#12343)', {
          hash: '1'
        }),
        makeCommitFromMsg('Dino (#1235)', {
          hash: '2'
        }),
        makeCommitFromMsg('Foo Bar', {
          hash: '3'
        })
      ]);
      getCommitsForPR.mockReturnValue(
        Promise.resolve([
          {
            sha: '2',
            commit: {},
            author: {
              name: 'Adam Dierkens',
              email: 'adam@dierkens.com'
            }
          }
        ])
      );
      getCommitsForPR.mockReturnValue(
        Promise.resolve([
          {
            sha: '2',
            commit: {},
            author: {
              name: 'Adam Dierkens',
              email: 'adam@dierkens.com'
            }
          }
        ])
      );
      getCommitsForPR.mockReturnValue(
        Promise.resolve([
          {
            sha: '3',
            commit: {},
            author: {
              name: 'Adam Dierkens',
              email: 'adam@dierkens.com'
            }
          }
        ])
      );
      getCommitsForPR.mockReturnValue(
        Promise.resolve([
          {
            sha: '3',
            commit: {},
            author: {
              name: 'Adam Dierkens',
              email: 'adam@dierkens.com'
            }
          }
        ])
      );

      expect(await gh.generateReleaseNotes('1234', '123')).toMatchSnapshot();
    });

    test('should gracefully handle failed fetches to merged PRs', async () => {
      const gh = new Release(git);

      const commits = await logParse.normalizeCommits([
        makeCommitFromMsg('First'),
        makeCommitFromMsg('Second (#123)')
      ]);

      getGitLog.mockReturnValueOnce(commits);

      getCommitsForPR
        .mockReturnValueOnce(Promise.reject('bah'))
        .mockReturnValueOnce(Promise.reject('bah'));

      await expect(
        gh.generateReleaseNotes('1234', '123')
      ).resolves.toBeDefined();
    });
  });

  describe('buildSearchQuery', () => {
    test('generates a valid query', () => {
      const query = buildSearchQuery('Andrew', 'test', [
        makeCommitFromMsg('first', { hash: 'abc123' }),
        makeCommitFromMsg('second', { hash: '3def78' })
      ]);
      expect(() => parse(query!)).not.toThrow();
      expect(query).toMatchSnapshot();
    });

    test("doesn't generate a query without commits", () => {
      const query = buildSearchQuery('Andrew', 'test', []);
      expect(query).toBeUndefined();
    });
  });

  describe('getSemverBump', () => {
    test('default to patch', async () => {
      const gh = new Release(git);
      const commits = [
        makeCommitFromMsg('First'),
        makeCommitFromMsg('Second'),
        makeCommitFromMsg('Third')
      ];

      getGitLog.mockReturnValueOnce(commits);

      expect(await gh.getSemverBump('1234')).toBe(SEMVER.patch);
    });

    test('should use higher version', async () => {
      const gh = new Release(git);
      const commits = [
        makeCommitFromMsg('First (#1234)'),
        makeCommitFromMsg('Second'),
        makeCommitFromMsg('Third')
      ];

      getGitLog.mockReturnValueOnce(commits);
      getPr.mockReturnValueOnce(mockLabels(['minor']));

      expect(await gh.getSemverBump('1234', '123')).toBe(SEMVER.minor);
    });

    test('should not publish a release', async () => {
      const gh = new Release(git);
      const commits = [
        makeCommitFromMsg('First (#1234)'),
        makeCommitFromMsg('Second (#1235)'),
        makeCommitFromMsg('Third (#1236)')
      ];

      getGitLog.mockReturnValueOnce(commits);
      getPr.mockReturnValueOnce(mockLabels(['skip-release', 'patch']));
      getPr.mockReturnValueOnce(mockLabels(['skip-release', 'patch']));
      getPr.mockReturnValueOnce(mockLabels(['skip-release', 'minor']));

      expect(await gh.getSemverBump('1234', '123')).toBe('');
    });

    test('should publish a release', async () => {
      const gh = new Release(git);
      const commits = [
        makeCommitFromMsg('First (#1234)'),
        makeCommitFromMsg('Second (#1235)'),
        makeCommitFromMsg('Third (#1236)')
      ];

      getGitLog.mockReturnValueOnce(commits);
      getPr.mockReturnValueOnce(mockLabels(['patch']));
      getPr.mockReturnValueOnce(mockLabels(['skip-release', 'patch']));
      getPr.mockReturnValueOnce(mockLabels(['skip-release', 'minor']));

      expect(await gh.getSemverBump('1234', '123')).toBe(SEMVER.minor);
    });

    test('should default to publish a prepatch', async () => {
      const gh = new Release(git);
      const commits = [
        makeCommitFromMsg('First (#1234)'),
        makeCommitFromMsg('Second (#1235)'),
        makeCommitFromMsg('Third (#1236)')
      ];

      getGitLog.mockReturnValueOnce(commits);
      getPr.mockReturnValueOnce(mockLabels(['skip-release']));
      getPr.mockReturnValueOnce(mockLabels([]));
      getPr.mockReturnValueOnce(mockLabels([]));

      expect(await gh.getSemverBump('1234', '123')).toBe('');
    });

    test('should not publish a release in onlyPublishWithReleaseLabel without label', async () => {
      const gh = new Release(git, {
        onlyPublishWithReleaseLabel: true,
        skipReleaseLabels: [],
        labels: defaultLabelDefinition,
        baseBranch: 'master'
      });
      const commits = [
        makeCommitFromMsg('First (#1234)'),
        makeCommitFromMsg('Second (#1235)'),
        makeCommitFromMsg('Third (#1236)')
      ];

      getGitLog.mockReturnValueOnce(commits);
      getPr.mockReturnValueOnce(mockLabels(['patch']));
      getPr.mockReturnValueOnce(mockLabels(['major']));
      getPr.mockReturnValueOnce(mockLabels(['patch']));

      expect(await gh.getSemverBump('1234', '123')).toBe('');
    });

    test('should publish a release in onlyPublishWithReleaseLabel with label', async () => {
      const gh = new Release(git, {
        onlyPublishWithReleaseLabel: true,
        skipReleaseLabels: [],
        labels: defaultLabelDefinition,
        baseBranch: 'master'
      });
      const commits = [
        makeCommitFromMsg('First (#1234)'),
        makeCommitFromMsg('Second (#1235)'),
        makeCommitFromMsg('Third (#1236)')
      ];

      getGitLog.mockReturnValueOnce(commits);
      getPr.mockReturnValueOnce(mockLabels(['release', 'patch']));
      getPr.mockReturnValueOnce(mockLabels(['patch']));
      getPr.mockReturnValueOnce(mockLabels(['minor']));

      expect(await gh.getSemverBump('1234', '123')).toBe(SEMVER.minor);
    });

    test('should be able to configure labels', async () => {
      const customLabels = merge(defaultLabelDefinition, {
        [SEMVER.major]: [{ name: 'Version: Major' }],
        [SEMVER.minor]: [{ name: 'Version: Minor' }],
        [SEMVER.patch]: [{ name: 'Version: Patch' }],
        release: [{ name: 'Deploy' }]
      });

      const gh = new Release(git, {
        onlyPublishWithReleaseLabel: true,
        skipReleaseLabels: [],
        labels: customLabels,
        baseBranch: 'master'
      });
      const commits = [
        makeCommitFromMsg('First (#1234)'),
        makeCommitFromMsg('Second (#1235)'),
        makeCommitFromMsg('Third (#1236)')
      ];

      // Test default labels do nothing
      getGitLog.mockReturnValueOnce(commits);
      getPr.mockReturnValueOnce(mockLabels(['Version: Major']));
      getPr.mockReturnValueOnce(mockLabels(['Version: Patch']));
      getPr.mockReturnValueOnce(mockLabels(['Version: Minor', 'release']));

      expect(await gh.getSemverBump('1234', '123')).toBe('');

      getGitLog.mockReturnValueOnce(commits);
      getPr.mockReturnValueOnce(mockLabels(['Version: Minor', 'Deploy']));
      getPr.mockReturnValueOnce(mockLabels(['Version: Major']));
      getPr.mockReturnValueOnce(mockLabels(['Version: Patch']));

      expect(await gh.getSemverBump('1234', '123')).toBe(SEMVER.major);
    });
  });

  describe('addLabelsToProject', () => {
    test('should add labels', async () => {
      const gh = new Release(git);
      const customLabels = {
        [SEMVER.major]: [{ name: '1', description: 'major' }],
        [SEMVER.minor]: [{ name: '2', description: 'minor' }],
        [SEMVER.patch]: [{ name: '3', description: 'patch' }]
      };

      await gh.addLabelsToProject(customLabels);

      expect(createLabel).toHaveBeenCalledWith(SEMVER.major, {
        name: '1',
        description: 'major'
      });
      expect(createLabel).toHaveBeenCalledWith(SEMVER.minor, {
        name: '2',
        description: 'minor'
      });
      expect(createLabel).toHaveBeenCalledWith(SEMVER.patch, {
        name: '3',
        description: 'patch'
      });
    });

    test('should log that it has created the labels', async () => {
      const mockLogger = dummyLog();
      mockLogger.log.log = jest.fn();

      const gh = new Release(
        git,
        {
          skipReleaseLabels: [],
          labels: defaultLabelDefinition,
          baseBranch: 'master'
        },
        mockLogger
      );

      const labels = {
        [SEMVER.patch]: [{ name: '3', description: 'three' }]
      };

      await gh.addLabelsToProject(labels);

      expect(mockLogger.log.log).toHaveBeenCalledWith('Created labels: 3');
      expect(mockLogger.log.log).toHaveBeenCalledWith(
        '\nYou can see these, and more at https://github.com/web/site/labels'
      );
    });

    test('should not add old labels', async () => {
      const gh = new Release(git);
      const labels = {
        [SEMVER.major]: [{ name: '1', description: 'major' }],
        [SEMVER.minor]: [{ name: '2', description: 'minor' }]
      };

      getProjectLabels.mockReturnValueOnce(['1']);
      await gh.addLabelsToProject(labels);

      expect(updateLabel).toHaveBeenCalledWith(SEMVER.major, {
        name: '1',
        description: 'major'
      });
      expect(createLabel).toHaveBeenCalledWith(SEMVER.minor, {
        description: 'minor',
        name: '2'
      });
    });

    test('should not add old labels - case sensitive', async () => {
      const gh = new Release(git);
      const labels = {
        [SEMVER.major]: [{ name: 'major', description: '' }],
        [SEMVER.minor]: [{ name: 'Minor', description: '' }]
      };

      getProjectLabels.mockReturnValueOnce(['Major', 'minor']);
      await gh.addLabelsToProject(labels);

      expect(updateLabel).toHaveBeenCalledWith(SEMVER.major, {
        name: 'major',
        description: ''
      });
      expect(updateLabel).toHaveBeenCalledWith(SEMVER.minor, {
        description: '',
        name: 'Minor'
      });
    });

    test('should add release label in onlyPublishWithReleaseLabel mode', async () => {
      let gh = new Release(git, {
        skipReleaseLabels: [],
        labels: defaultLabelDefinition,
        baseBranch: 'master'
      });
      const labels = {
        release: [{ name: 'deploy', description: 'release the code' }]
      };

      await gh.addLabelsToProject(labels);
      expect(createLabel).not.toHaveBeenCalledWith('release', {
        name: 'deploy',
        description: 'release the code'
      });

      gh = new Release(git, {
        onlyPublishWithReleaseLabel: true,
        skipReleaseLabels: [],
        labels: defaultLabelDefinition,
        baseBranch: 'master'
      });
      await gh.addLabelsToProject(labels);
      expect(createLabel).toHaveBeenCalledWith('release', {
        name: 'deploy',
        description: 'release the code'
      });
    });

    test('should add skip-release label not in onlyPublishWithReleaseLabel mode', async () => {
      let gh = new Release(git, {
        onlyPublishWithReleaseLabel: true,
        skipReleaseLabels: [],
        labels: defaultLabelDefinition,
        baseBranch: 'master'
      });
      const labels = {
        'skip-release': [
          { name: 'no!', description: 'Do not create a release' }
        ]
      };

      await gh.addLabelsToProject(labels);
      expect(createLabel).not.toHaveBeenCalledWith('skip-release', {
        name: 'no!',
        description: 'Do not create a release'
      });

      gh = new Release(git, {
        skipReleaseLabels: [],
        labels: defaultLabelDefinition,
        baseBranch: 'master'
      });
      await gh.addLabelsToProject(labels);
      expect(createLabel).toHaveBeenCalledWith('skip-release', {
        description: 'Do not create a release',
        name: 'no!'
      });
    });
  });
});
