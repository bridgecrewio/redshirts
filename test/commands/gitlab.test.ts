import {expect, test} from '@oclif/test';

describe('gitlab', () => {
  test
  .stdout()
  .command(['gitlab'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world');
  });

  test
  .stdout()
  .command(['gitlab', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff');
  });
});
