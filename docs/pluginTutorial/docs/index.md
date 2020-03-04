# Tutorial

In this documentation, we will build three different plugins to show traffic and air quality data in PathAdvisor system.

Imagine there are some external APIs available telling us the traffic and air quality data around the UST campus and we want to visualize those data from APIs by drawing a heat map and colored walking paths in PathAdvisor system map.

We will cover all the APIs and functions we need in this tutorial. The full plugin documentation is available [here](https://pathadvisor.ust.hk/docs).

## Overview

To develop this plugin, we need to do the following steps:

* Get the mock APIs up and running that gives us traffic and air quality data.
* Fork the PathAdvisor project and get it up and running.
* Implement the plugins.
* Create pull request.

## System requirement

In this tutorial, it is assumed that you have installed

- **[node js >=10][1]**
- **[git][2]**

in your operation system.

You can develop plugins on Windows, Linux or MacOS

[1]: https://nodejs.org/en/
[2]: https://git-scm.com/