/*jslint node: true*/

'use strict';

module.exports = function (audit) {

    // Create a new local scope
    audit.registerTask('createScope', function (node, options) {
        /*jslint unparam: true*/
        this.scopeChain.push(options.scope ? [].concat(options.scope) : []);
    });

    // Delete current local scope
    audit.registerTask('deleteScope', function () {
        this.scopeChain.pop();
    });

    // Add variable names to local scope
    audit.registerTask('addToLocalScope', function (item) {
        // For node type 'Identifier' only
        if (item.type === 'Identifier' && !this.isVarDefined(item.name, true)) {

            // Push error to result stack
            if (this.scopeChain.length === 2) {
                this.addResult('program_assignment', {
                    name: item.name,
                    loc: item.loc,
                    scope: [].concat(this.scopeChain)
                });
            }

            // Push node name on last scope chain item (current scope)
            this.scopeChain[this.scopeChain.length - 1].push(item.name);
        }
    });

    // Detect usage of undefined globals
    audit.registerTask('detectGlobalUsage', {
        condition: function (node, options) {
            return !options.computed || node.computed;
        },
        handle: function (item) {
            // For node type 'Identifier' only and if node name not in scope chain
            if (item.type === 'Identifier' && !this.isVarDefined(item.name)) {

                // Push error to result stack
                this.addResult('use_before_defined', {
                    name: item.name,
                    loc: item.loc,
                    scope: [].concat(this.scopeChain)
                });
            }
        }
    });

    // Detect global assigmnets
    audit.registerTask('detectGlobalAssignment', function (item) {
        // For node type 'Identifier' only and if node name not in scope chain
        if (item.type === 'Identifier' && !this.isVarDefined(item.name)) {

            // Push error to result stack
            this.addResult('global_assignment', {
                name: item.name,
                loc: item.loc,
                scope: [].concat(this.scopeChain)
            });
        }
    });

    // Detect creating references on the require method
    audit.registerTask('detectRequireReferences', function (item) {
        // For node type 'Identifier' only and name of the identifier has to be 'require'
        if (item.type === 'Identifier' && item.name === 'require') {

            // Push error to result stack
            this.addResult('reference_require', {
                name: item.name,
                loc: item.loc,
                scope: [].concat(this.scopeChain)
            });
        }
    });

    // Detect require arguments are object references / computed objects
    audit.registerTask('detectRequireComputed', {
        condition: function (node) {
            return node.callee && node.callee.name === 'require';
        },
        handle: function detectRequireComputed(item) {
            if (item.type === 'ArrayExpression') {
                // If require is used in AMD mode check the array items for usage of references (computed)

                item.elements.forEach(detectRequireComputed, this);
            } else if (item.type !== 'Literal' || (item.type === 'Literal' && typeof item.value !== 'string')) {
                // For node type is not 'Literal'

                // Push error to result stack
                this.addResult('require_computed', {
                    name: item.name,
                    loc: item.loc,
                    scope: [].concat(this.scopeChain)
                });
            }
        }
    });

};