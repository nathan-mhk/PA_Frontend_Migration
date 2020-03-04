# Pull request

Once you have finished your plugin and you have tested it is working correctly, you can create a pull request to upstream repository in gitlab.

If your working repository isn't forked from gitlab, you should fork one in gitlab and push your changes to your forked repository. You can find the instruction from [Get it up and running](setup.md) section

Creating a pull request is straightforward. You can go to your gitlab fork repository on web dashboard and create a merge request to upstream repository. In Soruce branch section, choose your fork repo and the branch you wish to be merged. In Target branch, choose thenrikie/pathadvisor-frontend. It will tell you if there is any conflict, if there is any you should resolve it first before creating a pull request.

The PathAdvisor team will review and merge the request and your plugin will be deployed to production in the next deployment schedule.