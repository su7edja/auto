# Plugins

`auto` uses the package [tapable](https://github.com/webpack/tapable) to expose a plugin system.

Current official plugins:

- [chrome](../../plugins/chrome/README.md) - publish code to Chrome Web Store
- [conventional-commits](../../plugins/conventional-commits/README.md) - parse conventional commit messages for version bumps
- [jira](../../plugins/jira/README.md) - Include jira story links in the changelog
- [git-tag](../../plugins/git-tag/README.md) - Manage your projects version through just a git tag
- [npm](../../plugins/npm/README.md) - publish code to npm (DEFAULT)
- [omit-commits](../../plugins/omit-commits/README.md) - Ignore commits made by certain accounts
- [omit-release-notes](../../plugins/omit-release-notes/README.md) - Ignore release notes in PRs made by certain accounts
- [released](../../plugins/released/README.md) - Add a `released` label to published PRs, comment with the version it's in[cluded in and comment on the issues the PR closes
- [s3](../../plugins/released/README.md) - post your built artifacts to s3
- [slack](../../plugins/slack/README.md) - post release notes to slack
- [twitter](../../plugins/twitter/README.md) - post release notes to twitter
- [upload-assets](../../plugins/upload-assets/README.md) - add extra assets to the release

## Using Plugins

To use a plugin you can either supply the plugin via a CLI arg or in your [.autorc](./autorc.md#plugins). Specifying a plugin overrides the defaults.

There are three ways to load a plugin.

### 1. Official Plugins

To use an official plugin all you have to do is supply the name.

```sh
auto shipit --plugins npm
```

### 2. `npm` package

If you are using a plugin distributed on `npm` simply supply the name. Ensure that the plugin is added as a dependency of your project.

```sh
auto shipit --plugins NPM_PACKAGE_NAME
```

### 3. Path

Or if you have a plugin locally supply the path.

```sh
auto shipit --plugins ../path/to/plugin.js
```

### Multiple

If you want to use multiple plugins you can supply multiple.

```sh
auto shipit --plugins npm NPM_PACKAGE_NAME ../path/to/plugin.js
```

### Plugin Configuration

To provide plugin specific config change the following:

```json
{
  "plugins": ["chrome"]
}
```

To this:

```json
{
  "plugins": [
    ["chrome", { "extensionId": "1234", "build": "my-compiled-extension.zip" }]
  ]
}
```
