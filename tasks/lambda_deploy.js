/*
 * grunt-aws-lambda
 * https://github.com/Tim-B/grunt-aws-lambda
 *
 * Copyright (c) 2014 Tim-B
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {

    var path = require('path');
    var fs = require('fs');
    var AWS = require('aws-sdk');


    // Please see the Grunt documentation for more information regarding task
    // creation: http://gruntjs.com/creating-tasks

    grunt.registerMultiTask('lambda_deploy', 'Uploads a package to lambda', function () {

        grunt.config.requires('lambda_deploy.' + this.target + '.function');
        grunt.config.requires('lambda_deploy.' + this.target + '.package');

        var options = this.options({
            profile: null,
            region: 'us-east-1'
        });

        if (options.profile !== null) {
            var credentials = new AWS.SharedIniFileCredentials({profile: options.profile});
            AWS.config.credentials = credentials;
        }

        var deploy_function = grunt.config.get('lambda_deploy.' + this.target + '.function');
        var deploy_package = grunt.config.get('lambda_deploy.' + this.target + '.package');
        var deploy_timeout = grunt.config.get('lambda_deploy.' + this.target + '.options.timeout');

        AWS.config.update({region: options.region});

        var done = this.async();

        var lambda = new AWS.Lambda();

        lambda.getFunction({FunctionName: deploy_function}, function (err, data) {

            if (err) {
                if(err.statusCode === 404) {
                    grunt.fail.warn('Unable to find lambda function ' + deploy_function + ', verify the lambda function name and AWS region are correct.');
                } else {
                    grunt.fail.warn('AWS API request failed, check your AWS credentials and permissions are correct.');
                }
            }

            var current = data.Configuration;

            var params = {
                FunctionName: deploy_function,
                Handler: current.Handler,
                Mode: current.Mode,
                Role: current.Role,
                Runtime: current.Runtime
            };

            if (deploy_timeout !== null) {
                params.Timeout = deploy_timeout;
            }

            grunt.log.writeln('Uploading...');
            fs.readFile(deploy_package, function (err, data) {
                params['FunctionZip'] = data;
                lambda.uploadFunction(params, function (err, data) {
                    if (err) {
                        grunt.fail.warn('Package upload failed, check you have iam:PassRole permissions.');
                    }
                    grunt.log.writeln('Package deployed.');
                    done(true);
                });
            });
        });
    });
};
