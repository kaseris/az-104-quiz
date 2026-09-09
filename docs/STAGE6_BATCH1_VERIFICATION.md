# 6A.3 — First expansion batch verification

Two new drafts, version 1, documentation reviewed 2026-09-08. **No Azure executions recorded.** These drafts are hidden from the app until both methods pass review and cleanup. Earlier pilot reports and CLI version 2.90.0 are not evidence for these new exercises.

Use the complete guides:

- [Create and inspect a storage account](LAB_storage-account-basics.md)
- [Deploy and update an ARM template](LAB_arm-storage-deployment.md)

Test one method at a time and delete its dedicated group before the next run. The ARM lab has its own account; it does not depend on completing the storage lab.

| Exercise/version           | Method | Result  | Verification date | Tested CLI   | Minutes | Cleanup |
| -------------------------- | ------ | ------- | ----------------- | ------------ | ------- | ------- |
| storage-account-basics / 1 | Portal | Pending | —                 | N/A          | —       | Pending |
| storage-account-basics / 1 | CLI    | Pending | —                 | Not reported | —       | Pending |
| arm-storage-deployment / 1 | Portal | Pending | —                 | N/A          | —       | Pending |
| arm-storage-deployment / 1 | CLI    | Pending | —                 | Not reported | —       | Pending |

For **each of the four rows**, check and report:

- [ ] Prerequisites: subscription access, role/scope and allowed region confirmed.
- [ ] Setup: new dedicated group/account selected and no shared resources used.
- [ ] Instructions: every step followed; record Portal label differences and command changes.
- [ ] Expected result: all listed settings checked; ARM also needs first/second tag values, one account and matching deployment output.
- [ ] Hints: tried/reviewed and any unclear guidance recorded.
- [ ] Reflection: answered and compared with the suggested answer.
- [ ] Cleanup: resource list inspected, group deleted, group AND account absence confirmed in the same subscription. If blocked, record pending.
- [ ] Elapsed time: include reading and waiting; identify retries separately.
- [ ] Discrepancies: record environment/access/policy problems separately from conceptual mistakes.

Copy this short report once per method (no screenshots required):

```text
Exercise and version:
Method: Portal / CLI
Date:
Region and role/scope (no subscription ID):
CLI version (CLI method only, from az version):
Prerequisites/setup: passed / discrepancy
Results: actual settings; ARM first/second tag, output and account count
Hints/reflection: reviewed; answer or unclear point
Cleanup: group and account deleted; how absence was checked
Time: approximate minutes, plus retries if any
Problems/deviations: none, or sanitized details and category
```

Do not paste subscription/tenant IDs, account keys, tokens or connection strings. Successful local tests and documentation review are not Azure verification. Review findings before releasing; content changes affecting executed steps require rechecking those methods at the current version. Leave incomplete methods pending and preserve failed attempts with the later retry outcome.

Next: collect these four user walkthrough reports, correct any findings and release each exercise only after both methods and cleanup pass. Then author the next two-exercise batch; 6A.3 remains incomplete until ten verified exercises cover every domain twice.
